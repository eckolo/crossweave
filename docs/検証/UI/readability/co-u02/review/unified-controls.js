// Honest presentation boundary, outside the game UI.
const sampleNote=host.querySelector('[data-review-note]');
const noteInitial='取得・編成は操作確認用です。探索への反映は未接続です。';
host.addEventListener('cw-acquisition-state',event=>{
 sampleNote.textContent=event.detail.modified?'取得・編成の変更は探索へ未接続のため、この状態での出発は停止しています。':noteInitial;
});
for(const selector of ['[data-review-case]','[data-review-open]'])host.querySelector(selector).addEventListener(selector.includes('case')?'change':'click',()=>{sampleNote.textContent=noteInitial;});
