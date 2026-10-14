"""Offline research only. Requires transformers 4.49.0, torch 2.6.0 CPU. No remote code, uploads or grades."""
import argparse,hashlib
import json,time
from pathlib import Path
import torch,numpy as np
from PIL import Image,ImageOps
from transformers import VisionEncoderDecoderModel,PreTrainedTokenizerFast,ViTImageProcessor
parser=argparse.ArgumentParser();parser.add_argument('--model',required=True);parser.add_argument('--model-sha',required=True);parser.add_argument('--manifest',required=True);parser.add_argument('--output',required=True);args=parser.parse_args();root=args.model
with open(root+'/model.safetensors','rb') as stream:
 if hashlib.file_digest(stream,'sha256').hexdigest()!=args.model_sha:raise ValueError('Changed model')
torch.set_num_threads(4)
processor=ViTImageProcessor(**json.loads(Path(root+'/processor_config.json').read_text())['image_processor'])
tokenizer=PreTrainedTokenizerFast(tokenizer_file=root+'/tokenizer.json',bos_token='<s>',eos_token='</s>',pad_token='<pad>',unk_token='<unk>')
model=VisionEncoderDecoderModel.from_pretrained(root,local_files_only=True,use_safetensors=True).eval()
rows=[]
samples=json.loads(Path(args.manifest).read_text())['samples']
if not 1<=len(samples)<=40:raise ValueError('Invalid sample count')
for s in samples:
 with Image.open(s['image']) as original:
  box=s['box']
  if len(box)!=4 or any(type(v) is not int for v in box) or not 0<=box[0]<box[2]<=original.width or not 0<=box[1]<box[3]<=original.height:raise ValueError('Invalid crop')
  crop=original.convert('RGB').crop(box)
 for variant in ['original','contrast']:
  line=ImageOps.autocontrast(crop) if variant=='contrast' else crop
  width=max(1,round(line.width*102/line.height));line=line.resize((width,102))
  if width>512:line=line.resize((512,102))
  else:
   canvas=Image.new('RGB',(512,102),'white');canvas.paste(line,((512-width)//2,0));line=canvas
  pixels=processor(images=line,return_tensors='pt').pixel_values
  start=time.monotonic()
  with torch.inference_mode(): ids=model.generate(pixel_values=pixels,max_new_tokens=100,interpolate_pos_encoding=True)
  actual=tokenizer.batch_decode(ids,skip_special_tokens=True)[0]
  rows.append({'sample':s['id'],'variant':variant,'text':actual,'reference':s['reference'],'exact':actual==s['reference'],'seconds':round(time.monotonic()-start,2),'academic_score':None})
Path(args.output).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(json.dumps({'attempts':len(rows),'exact':sum(r['exact'] for r in rows)}))
