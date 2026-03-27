import type { ServerToken } from '@/types';

let kuromojiTokenizer: any = null;

export async function initKuromoji(): Promise<void> {
  if (kuromojiTokenizer) return;
  const kuromoji = await import('kuromoji');
  kuromojiTokenizer = await new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: 'node_modules/kuromoji/dict' })
      .build((err: any, tokenizer: any) =>
        err ? reject(err) : resolve(tokenizer)
      );
  });
}

export async function tokenizeJapaneseServer(
  text: string
): Promise<ServerToken[]> {
  await initKuromoji();
  const tokens = kuromojiTokenizer.tokenize(text);
  let offset = 0;
  return tokens.map((t: any) => {
    const tok: ServerToken = {
      surface: t.surface_form,
      lookup: t.basic_form || t.surface_form,
      reading: t.reading,
      isWord: !['記号', '空白', 'BOS/EOS'].includes(t.part_of_speech),
      startOffset: offset,
    };
    offset += t.surface_form.length;
    return tok;
  });
}

export async function tokenizeChineseServer(
  text: string
): Promise<ServerToken[]> {
  const pinyinPro = await import('pinyin-pro');
  const segments = pinyinPro.segment(text) as unknown as string[];
  let offset = 0;
  return segments.map((seg: string) => {
    const isHan = /\p{Script=Han}/u.test(seg);
    const tok: ServerToken = {
      surface: seg,
      lookup: seg,
      reading: isHan
        ? pinyinPro.pinyin(seg, { toneType: 'symbol', separator: '' })
        : undefined,
      isWord: isHan || /\p{L}/u.test(seg),
      startOffset: offset,
    };
    offset += seg.length;
    return tok;
  });
}
