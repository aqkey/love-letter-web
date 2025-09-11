import React from "react";

interface HowToProps {
  setScreen: (screen: "lobby" | "game" | "result" | "howto") => void;
}

export const HowToContent: React.FC = () => {
  const cards = [
    { id: 1,  en: 'soldier',          name: '兵士',         desc: '相手の手札を宣言して的中すると相手は脱落（兵士は宣言不可／伯爵夫人は宣言可）。', cost: 1, count: 5 },
    { id: 2,  en: 'clown',            name: '道化',         desc: '指定した相手の手札を1枚だけ見る。',                                          cost: 2, count: 2 },
    { id: 3,  en: 'knight',           name: '騎士',         desc: '相手と手札の強さを比べ、弱い方が脱落（同値は何も起きない）。',              cost: 3, count: 2 },
    { id: 4,  en: 'monk',             name: '僧侶',         desc: '次の自分のターン開始まで、自分は保護される。',                              cost: 4, count: 2 },
    { id: 5,  en: 'sorcerer',         name: '魔術師',       desc: '相手（または自分）の手札を捨てさせ、新しい1枚を引かせる（伯爵夫人は捨てさせ不可）。', cost: 5, count: 2 },
    { id: 6,  en: 'general',          name: '将軍',         desc: '相手と手札を入れ替える。',                                                  cost: 6, count: 1 },
    { id: 7,  en: 'minister',         name: '大臣',         desc: '自分の手札コスト合計が12以上になったら即脱落。',                            cost: 7, count: 1 },
    { id: 11, en: 'marchioness',      name: '女侯爵',       desc: '自分の手札コスト合計が12以上なら、このカードを出さなければならない。',      cost: 7, count: 1 },
    { id: 8,  en: 'princess',         name: '姫',           desc: '捨てると即脱落（姫(眼鏡)があれば復活の可能性）。',                          cost: 8, count: 1 },
    { id: 9,  en: 'princess_glasses', name: '姫(眼鏡)',     desc: '脱落時にこれを捨てると即復活し、山札から1枚引く。',                          cost: 8, count: 1 },
    { id: 10, en: 'countess',         name: '伯爵夫人',     desc: '場に出せない。山札が尽きた時に所持していると脱落（魔術師でも捨てさせ不可）。', cost: 8, count: 1 },
    { id: 12, en: 'princess_bomb',    name: '姫(爆弾)',     desc: '捨てると即脱落。復活不可で、状況により即時決着。',                          cost: 8, count: 1 },
  ].sort((a, b) => a.cost - b.cost || a.id - b.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ルール説明</h1>
      <p>
        Love Letter は、各カードの効果を使って相手を脱落させたり、山札が尽きた時に
        最も強い手札を持っているプレイヤーが勝利するゲームです。
      </p>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">基本の流れ</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>最初にプレイヤーには1枚手札が配られる。</li>
          <li>自分のターン開始時、山札から1枚引き、手札が2枚になる。</li>
          <li>どちらか1枚を場に出し、カードの効果を解決する。</li>
          <li>次のプレイヤーにターンが移る。</li>
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">カード一覧</h2>
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <img
                src={`/cards/${c.en}.svg`}
                alt={c.name}
                className="w-10 h-auto rounded ring-1 ring-gray-200"
              />
              <div>
                <p className="font-semibold">{c.name} <span className="text-xs text-gray-600">（{c.count}枚）</span></p>
                <p className="text-sm text-gray-700">コスト {c.cost}：{c.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-gray-600">
        画面上の「イベントログ」に、プレイや効果の結果が表示されます。
      </p>
    </div>
  );
};

const HowTo: React.FC<HowToProps> = ({ setScreen }) => {
  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow space-y-4">
      <HowToContent />
      <div className="flex gap-2">
        <button
          onClick={() => setScreen("lobby")}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          ロビーへ戻る
        </button>
      </div>
    </div>
  );
};

export default HowTo;
