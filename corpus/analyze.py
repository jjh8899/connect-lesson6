import zipfile,re,json,math,hashlib
from pathlib import Path
z=zipfile.ZipFile('corpus/brown.zip');sentences=[]
for name in sorted(z.namelist()):
 if not re.fullmatch(r'brown/c[a-z]\d\d',name):continue
 for line in z.read(name).decode().splitlines():
  tokens=[t.rsplit('/',1)[0].lower() for t in line.split() if '/' in t]
  if tokens:sentences.append(tokens)
# Hand-specified inflections; no corpus-driven candidate selection.
specs=[('spend time',['spend','spends','spent','spending'],['time']),('post a photo',['post','posts','posted','posting'],['photo','photos','photograph','photographs']),('send someone a text message',['send','sends','sent','sending'],['text','texts']),('share one’s problems',['share','shares','shared','sharing'],['problem','problems']),('make a gesture',['make','makes','made','making'],['gesture','gestures']),('leave a comment',['leave','leaves','left','leaving'],['comment','comments']),('give someone advice',['give','gives','gave','given','giving'],['advice']),('win a gold medal',['win','wins','won','winning'],['medal','medals']),('in the middle of',['middle'],['of']),('in the middle of the night',['middle'],['night'])]
def logchoose(n,k):return math.lgamma(n+1)-math.lgamma(k+1)-math.lgamma(n-k+1)
def fisher(a,b,c,d):
 n=a+b+c+d;r=a+b;k=a+c
 terms=[logchoose(k,x)+logchoose(n-k,r-x)-logchoose(n,r) for x in range(a,min(r,k)+1)]
 m=max(terms);return min(1,math.exp(m)*sum(math.exp(v-m) for v in terms))
rows=[];N=len(sentences)
for phrase,A,B in specs:
 a=na=nb=near=exact=0
 for ts in sentences:
  hasA=any(t in A for t in ts);hasB=any(t in B for t in ts);na+=hasA;nb+=hasB;a+=hasA and hasB
  near+=sum(any(t in B for t in ts[i+1:i+5]) for i,t in enumerate(ts) if t in A)
  if phrase.startswith('in the middle'):
   pat=phrase.split();exact+=sum(ts[i:i+len(pat)]==pat for i in range(len(ts)))
 b=na-a;c=nb-a;d=N-a-b-c;p=fisher(a,b,c,d) if a else 1
 rows.append(dict(phrase=phrase,A=A,B=B,sentences=N,nodeSentences=na,collocateSentences=nb,cooccurrenceSentences=a,expected=na*nb/N,PMI=math.log2(a*N/(na*nb)) if a else None,p=p,nearFrequency=near,exactFrequency=exact if phrase.startswith('in the middle') else None))
# Holm family-wise correction across all 10 prespecified pairs.
previous=0
for rank,row in enumerate(sorted(rows,key=lambda r:r['p'])):
 previous=max(previous,min(1,row['p']*(len(rows)-rank)));row['adjustedP']=previous
for r in rows:r['supported']=r['adjustedP']<.05 and (r['PMI'] or 0)>0 and r['nearFrequency']>=5
report=dict(corpus='Brown, US published texts, 1961',source='https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/brown.zip',sha256=hashlib.sha256(Path('corpus/brown.zip').read_bytes()).hexdigest(),method='Sentence presence 2x2 one-sided Fisher exact test, Holm correction over 10 prespecified pairs; positive PMI and >=5 forward window (1-4 tokens) matches. Exploratory sentence association, not proof of full phrase collocation. Inflections explicit; sentence boundaries are Brown lines.',limitations='Historical corpus unsuitable for contemporary digital senses. No disambiguation of homonyms. Sentences from a document are not independent; p-values are exploratory. Word-pair significance does not establish the complete phrase.',results=rows)
Path('corpus/results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
for r in rows:print(r['phrase'],r['nearFrequency'],r['cooccurrenceSentences'],round(r['PMI'],2) if r['PMI'] else None,format(r['adjustedP'],'.3g'),r['supported'])
