// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

type Echo = App.Api.Ech0.Echo
type Tag = App.Api.Ech0.Tag

const tag = (id: string, name: string, usageCount = 1): Tag => ({
  id,
  name,
  usage_count: usageCount,
  created_at: Date.now(),
})

const tagWriting = tag('t-writing', '随笔', 18)
const tagReading = tag('t-reading', '阅读', 12)
const tagPoem = tag('t-poem', '诗', 9)
const tagDaily = tag('t-daily', '日常', 24)
const tagNight = tag('t-night', '夜读', 7)
const tagWhisper = tag('t-whisper', '私语', 3)
const tagWalk = tag('t-walk', '散步', 6)

const now = Date.now()

// Resolve local fixture art against the dev server, not the API origin.
const previewAsset = (name: string) =>
  new URL(`/preview/${name}`, window.location.origin).toString()

const at = (daysAgo: number, hour: number, minute: number) => {
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, 0, 0)
  return date.getTime()
}

const base = {
  username: '星野',
  user_id: 'demo-user',
  private: false,
  fav_count: 0,
}

export const demoEchoes: Echo[] = [
  {
    ...base,
    id: 'demo-01',
    created_at: at(0, 22, 14),
    fav_count: 12,
    tags: [tagWriting, tagNight],
    content: [
      '很晚的时候，城市像一封写到一半的信。',
      '',
      '窗外面的灯一盏一盏熄灭，像有人替天空把标点重新排过。我坐在桌前，把今天剩下的几句话慢慢写完。',
      '',
      '> 我们总以为来日方长，其实很多告别，都发生在寻常的傍晚。',
      '',
      '整理旧书的时候，翻出高中时夹在《诗经》里的一片银杏叶。叶脉还很清楚，像一条没有走完的路。那时候以为重要的东西，如今大多已经想不起名字；反而是随手夹进书页的一片叶子，替我记住了某个下午的光。',
      '',
      '所以还是想继续写下去。哪怕只是一些不重要的句子，至少它们曾经在某个夜晚，认真地亮过。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-02',
    created_at: at(0, 16, 40),
    fav_count: 5,
    tags: [tagDaily],
    content: '把窗开一条缝，让秋天进来坐一会儿。',
  },
  {
    ...base,
    id: 'demo-03',
    created_at: at(0, 9, 12),
    fav_count: 8,
    tags: [tagReading],
    content: [
      '读到一句很喜欢的话：',
      '',
      '> 山有木兮木有枝，心悦君兮君不知。',
      '',
      '出处是《越人歌》。古人说心事，不说破，只说山上有树、树上有枝，仿佛世间万物都替人含蓄地活着。',
      '',
      '把这句话抄在便签上，贴到了显示器旁边。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-04',
    created_at: at(1, 23, 5),
    fav_count: 3,
    tags: [tagDaily, tagWalk],
    content: [
      '今天的三件小事：',
      '',
      '1. 在巷口买到刚出炉的桂花糕，纸袋还是热的。',
      '2. 给阳台的绿萝换了一个陶盆，泥土弄脏了手指。',
      '3. 给很久没有联系的朋友写了一张明信片。',
      '',
      '写到最后一句时停了很久，才发现想说的话，其实都很轻。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-05',
    created_at: at(1, 14, 28),
    fav_count: 15,
    tags: [tagWriting],
    content: [
      '给博客加了一个很没用、但很可爱的小功能——随机展示一句诗。',
      '',
      '`const today = lines[Math.floor(Math.random() * lines.length)]`',
      '',
      '写完才发现，其实只是想让页面多一点意外。就像在一条走过很多遍的路上，忽然闻见桂花。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-web',
    created_at: at(1, 10, 5),
    fav_count: 6,
    tags: [tagReading],
    content: '收藏一个很安静的博客。主人写旧书店、写雨，也写搬家时舍不得扔掉的空玻璃瓶。',
    extension: {
      type: 'WEBSITE',
      payload: {
        title: '山月记 · 一个安静的博客',
        site: 'https://example.com/shanyue',
      },
    },
  },
  {
    ...base,
    id: 'demo-06',
    created_at: at(2, 20, 17),
    fav_count: 6,
    tags: [tagWriting],
    content: [
      '## 秋日来信',
      '',
      '风从北边来，带着一点凉。傍晚下楼扔垃圾，看见对楼的阿姨在阳台上收衣服，一件一件，像在收拢整个白天。',
      '',
      '回来的时候，楼道里飘着谁家的饭菜香。忽然觉得，所谓生活，大概就是这些不必被记录的瞬间，在身体里慢慢积成了温度。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-media',
    created_at: at(2, 16, 0),
    fav_count: 8,
    tags: [tagDaily],
    layout: 'grid',
    content: '傍晚在窗边画的两张小稿。',
    echo_files: [
      {
        echo_id: 'demo-media',
        file_id: 'preview-ink-1',
        file: {
          id: 'preview-ink-1',
          url: previewAsset('ink-mountain.svg'),
          storage_type: 'local',
          category: 'image',
          content_type: 'image/svg+xml',
          width: 800,
          height: 600,
        },
      },
      {
        echo_id: 'demo-media',
        file_id: 'preview-ink-2',
        file: {
          id: 'preview-ink-2',
          url: previewAsset('ink-window.svg'),
          storage_type: 'local',
          category: 'image',
          content_type: 'image/svg+xml',
          width: 800,
          height: 600,
        },
      },
    ],
  },
  {
    ...base,
    id: 'demo-07',
    created_at: at(2, 11, 2),
    fav_count: 21,
    tags: [tagPoem],
    content: ['雨停之后', '屋檐还在滴答', '像谁把一句话', '说了一半'].join('\n'),
  },
  {
    ...base,
    id: 'demo-08',
    created_at: at(3, 21, 36),
    fav_count: 1,
    private: true,
    tags: [tagWhisper],
    content: '一些还不能说出口的计划。等它长大一点，再拿出来晒太阳。',
  },
  {
    ...base,
    id: 'demo-github',
    created_at: at(3, 9, 40),
    fav_count: 14,
    tags: [tagWriting],
    content: '最近在读的源码。一个把「轻量」真正落实下来的自托管项目。',
    extension: {
      type: 'GITHUBPROJ',
      payload: {
        repoUrl: 'https://github.com/lin-snow/Ech0',
      },
    },
  },
  {
    ...base,
    id: 'demo-09',
    created_at: at(4, 18, 50),
    fav_count: 4,
    tags: [tagReading],
    content: [
      '发现一个很安静的博客，主人写旧书店、写雨、写搬家时舍不得扔掉的空玻璃瓶。',
      '',
      '读完忽然想把自己的 RSS 重新整理一遍。互联网这么大，还是想留一小块地方，只放喜欢的东西。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-location',
    created_at: at(4, 12, 15),
    fav_count: 5,
    tags: [tagWalk],
    content: '在湖边坐了一下午。风把水面吹成一张揉皱的纸。',
    extension: {
      type: 'LOCATION',
      payload: {
        placeholder: '杭州 · 西湖边',
        latitude: 30.246,
        longitude: 120.148,
      },
    },
  },
  {
    ...base,
    id: 'demo-10',
    created_at: at(5, 22, 8),
    fav_count: 9,
    tags: [tagNight, tagReading],
    content: [
      '地铁上读到一本书，作者说：',
      '',
      '> 所谓故乡，不过是先我们而存在、又在我们离开之后继续存在的地方。',
      '',
      '抬头的时候刚好到站。门开的一瞬间，风灌进来，带着一点潮湿的泥土味。忽然很想回家。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-11',
    created_at: at(5, 10, 24),
    fav_count: 7,
    tags: [tagWalk],
    content: [
      '清单：城市里可以安静坐一会儿的地方',
      '',
      '- 清晨的菜市场门口',
      '- 傍晚的江边台阶',
      '- 深夜还亮着灯的便利店',
      '- 下雨天的公交站',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-12',
    created_at: at(6, 15, 45),
    fav_count: 2,
    tags: [tagDaily],
    content: '今天的云很像一只蜷起来的猫。拍下来发给朋友，她说：像一团没写完的句子。',
  },
  {
    ...base,
    id: 'demo-13',
    created_at: at(7, 23, 58),
    fav_count: 11,
    tags: [tagWriting, tagNight],
    content: [
      '写博客这件事，断断续续做了很多年。',
      '',
      '最早是为了被看见，后来是为了不忘记，再后来，只是喜欢在夜里敲字的声音。',
      '',
      '有些话写在纸上会害羞，写在网页里反而坦然。也许因为知道，它会在某个陌生的清晨，被某个陌生人读到。',
    ].join('\n'),
  },
  {
    ...base,
    id: 'demo-14',
    created_at: at(8, 8, 6),
    fav_count: 3,
    tags: [tagPoem, tagDaily],
    content: [
      '早上煮了一壶茶，',
      '看热气在窗上写了一会儿字，',
      '又慢慢擦掉。',
      '',
      '新的一天，',
      '不必急着成为谁。',
    ].join('\n'),
  },
]
