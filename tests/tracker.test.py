"""Validate the distributed XLSX with the Python standard library only."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as E

root=Path(__file__).resolve().parents[1]
path=root/'Docs/job-tracker-template.xlsx'
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
months=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
headers=['Job ID','Status','Date Scraped','Source','Search KeyWord','Date Posted','Title','Work Mode','URL','Company Name','Location','Description','Language','Payment','Time Type','Job Type','Experience','Salary','Match','Qualified','Cover  Letter','Notes','Interview At','Invite Meet','Attended']
with ZipFile(path) as z:
 workbook=E.fromstring(z.read('xl/workbook.xml'))
 assert [s.attrib['name'] for s in workbook.findall('s:sheets/s:sheet',NS)]==months
 strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  strings=[''.join(si.itertext()) for si in E.fromstring(z.read('xl/sharedStrings.xml'))]
 def cellvalue(c):
  if c.attrib.get('t')=='inlineStr': return ''.join(c.find('s:is',NS).itertext())
  v=c.find('s:v',NS)
  if v is None: return None
  return strings[int(v.text)] if c.attrib.get('t')=='s' else v.text
 sheets=[n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')]
 assert len(sheets)==12
 for n in sheets:
  s=E.fromstring(z.read(n));rows=s.findall('s:sheetData/s:row',NS)
  header=next(r for r in rows if r.attrib['r']=='1')
  assert [cellvalue(c) for c in header]==headers,n
  for row in rows:
   if int(row.attrib['r'])>1:
    assert all(cellvalue(c) in (None,'') and c.find('s:f',NS) is None for c in row),n
  assert s.find('s:autoFilter',NS).attrib['ref']=='A1:Y1000'
  pane=s.find('.//s:pane',NS)
  assert pane is not None and pane.attrib.get('xSplit')=='2' and pane.attrib.get('ySplit')=='1',str(pane.attrib if pane is not None else None)
  assert not s.findall('s:hyperlinks',NS)
  dvs=s.findall('s:dataValidations/s:dataValidation',NS)
  source=[d for d in dvs if 'D2:D1000' in d.attrib['sqref']]
  assert source and 'LinkedIn Alert' in source[-1].find('s:formula1',NS).text
  for col in ['B','H','M','N','O','P','Q','S','T','Y']:
   assert any(col+'2:' in d.attrib['sqref'] for d in dvs),(n,col)
 for n in z.namelist():
  if n.endswith('.rels'):
   assert not any(e.attrib.get('Type','').endswith('/hyperlink') for e in E.fromstring(z.read(n)))
 assert not any('externalLink' in n for n in z.namelist())
print('PASS 12 monthly tabs, exact 25-column schema, blank data, filters, panes, validations, and no hyperlinks/external links.')
