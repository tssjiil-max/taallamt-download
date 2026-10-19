"""Offline-only research probe; no upload, no training, no academic grading.
The helper must be the reviewed, immutable sdkv2/muharaf-arabic-ocr source.
Install torch==2.6.0 (CPU), pillow==11.1.0, numpy==2.2.3 separately.
"""
import argparse
import hashlib
import importlib.util
import json
import time
import unicodedata
from pathlib import Path

HELPER_SHA = 'd29393c39516154203a201bec35a77341cfb6a0b29d65ad4e21bd5e2f1d60b43'
MODEL_REVISION = 'e75d511257d6a0c0ffdede92308e8e022c79e1c5'

def sha(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def distance(a, b):
    previous = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        current = [i]
        for j, y in enumerate(b, 1):
            current.append(min(current[-1] + 1, previous[j] + 1, previous[j-1] + (x != y)))
        previous = current
    return previous[-1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', required=True)
    parser.add_argument('--model-sha', required=True)
    parser.add_argument('--helper', required=True)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    if sha(args.helper) != HELPER_SHA or sha(args.model) != args.model_sha:
        raise ValueError('Unreviewed or changed model/helper')
    import numpy as np
    import torch
    from PIL import Image, ImageOps
    torch.set_num_threads(4)
    checkpoint = torch.load(args.model, map_location='cpu', weights_only=True)
    spec = importlib.util.spec_from_file_location('reviewed_htr_architecture', args.helper)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    chars, cfg = checkpoint['charset'], checkpoint['model_config']
    if len(chars) != 165 or any(not isinstance(c, str) for c in chars):
        raise ValueError('Unsupported charset')
    model = helper.CNNTransformerCTC(num_classes=len(chars)+1, d_model=256,
        num_encoder_layers=4, num_heads=8, dim_feedforward=1024,
        dropout=0.1, height_pooling='attention')
    model.load_state_dict(checkpoint['model_state'], strict=True)
    model.eval()
    rows = []
    samples = json.loads(Path(args.manifest).read_text())['samples']
    if not 1 <= len(samples) <= 40:
        raise ValueError('Invalid sample count')
    for sample in samples:
        with Image.open(sample['image']) as image:
            image.load()
            box = sample['box']
            if (len(box) != 4 or any(type(v) is not int for v in box)
                or not 0 <= box[0] < box[2] <= image.width
                or not 0 <= box[1] < box[3] <= image.height):
                raise ValueError('Invalid crop')
            rgb = np.array(image.convert('RGB').crop(box))
        # Only the recognition copy loses red pixels. Source images stay untouched.
        colors = rgb.astype(np.float32)
        red = ((colors[:,:,0] > 100) & (colors[:,:,0] > colors[:,:,1]*1.4)
               & (colors[:,:,0] > colors[:,:,2]*1.35)
               & (colors[:,:,0]-np.maximum(colors[:,:,1], colors[:,:,2]) > 40))
        rgb[red] = 255
        gray = Image.fromarray(rgb).convert('L')
        for variant in ['original', 'contrast']:
            line = ImageOps.autocontrast(gray) if variant == 'contrast' else gray
            width = max(16, round(line.width * 96 / line.height))
            if width > 2048:
                raise ValueError('Line too wide')
            line = line.resize((width, 96), Image.Resampling.BILINEAR)
            tensor = torch.from_numpy(np.array(line, dtype=np.float32)/255)[None,None,:,:]
            started = time.monotonic()
            with torch.inference_mode():
                logits = model(tensor)[:,0,:]
                prob, ids = logits.softmax(-1).max(-1)
            emitted, scores, previous = [], [], None
            for token, score in zip(ids.tolist(), prob.tolist()):
                if token != 0 and token != previous:
                    emitted.append(chars[token-1]); scores.append(score)
                previous = token
            actual = ''.join(emitted)
            reference = unicodedata.normalize('NFC', sample['reference'])
            actual = unicodedata.normalize('NFC', actual)
            rows.append({'sample':sample['id'], 'variant':variant, 'text':actual,
                'reference':reference, 'exact':actual==reference,
                'character_errors':distance(reference, actual),
                'reference_characters':len(reference), 'elapsed_ms':round((time.monotonic()-started)*1000),
                'raw_token_mean':sum(scores)/len(scores) if scores else None,
                'confidence_calibrated':False, 'academic_score':None, 'teacher_review_required':True})
    Path(args.output).write_text(json.dumps({'engine':'muharaf-ctc-greedy',
        'revision':MODEL_REVISION,'model_sha256':args.model_sha,
        'not_children_accuracy_benchmark':True,'results':rows}, ensure_ascii=False, indent=2))
    print(json.dumps({'samples':len(samples),'attempts':len(rows),
        'exact':sum(r['exact'] for r in rows),'automatic_grades':0}))

if __name__ == '__main__':
    main()
