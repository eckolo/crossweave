// 対象保持の回帰入力を、固定oracleの既存自然進行から取り出す検査専用スクリプト。
// Node.js標準機能だけを使用する。ゲームの実行・値の調整・通常セーブの編集はしない。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const destination = process.argv[2];
if (!destination) throw new Error('生成先の専用ディレクトリを指定してください。');
const oracle = JSON.parse(brotliDecompressSync(readFileSync(resolve(here, '../Tests/Fixtures/application-oracle.json.br'))));
const record = oracle.records.find(r => r.name === 'natural');
if (!record) throw new Error('固定oracleにnatural記録がありません。別入力で代用せず停止します。');
mkdirSync(destination, { recursive: true });
for (const [name, lastStep] of Object.entries({ place: 1, guard: 2, heal: 11 })) {
    const state = structuredClone(record.initial);
    // 既存UiAutomation.Deltaと同じく、oracleが持つ公開済みの期待差分だけを適用する。
    // 先頭から指定stepまで復元し、所持札・相手・規則・数値は変更しない。
    for (const step of record.steps.slice(0, lastStep + 1))
        for (const op of step.expected_delta) {
            let node = state;
            for (const key of op.path.slice(0, -1)) node = node[key];
            if (op.remove) delete node[op.path.at(-1)];
            else node[op.path.at(-1)] = structuredClone(op.value);
        }
    // 元JSとC#の接続名だけを、既存GenerateReviewFixturesと同じ形式へ変換する。
    state.schema = 'CW-CSharp-application-1';
    state.engine_version = 'CW-CSharp-core-1';
    const game = state.session.game.state;
    const attack = game.actors.P.hand.map(id => game.cards[id]).find(c => c.kind === 'attack' && game.field[c.attr]);
    if (!game.ready || !attack || !game.actors.E1?.active) throw new Error(name + ': 固定入力の前提が変わっています。');
    const fixture = { source_record: record.name, source_step: lastStep,
        dto: { FormatVersion: 1, RuleSetId: state.rule_set_id, ContentSetId: state.content_set_id, State: state },
        choice: { card_id: attack.id, target: 'E1' } };
    writeFileSync(resolve(destination, name + '.json'), JSON.stringify(fixture, null, 2));
}
