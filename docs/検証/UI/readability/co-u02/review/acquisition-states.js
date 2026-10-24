// Presentation cases only. Use the same mounted screen and its normal commands.
const acquisitionCases=[
 {id:'acquisition-open',label:'編成・取得前',state:'open'},
 {id:'acquisition-complete',label:'編成・取得確定後',state:'complete'},
 {id:'acquisition-empty',label:'編成・候補なし',state:'empty'}
];
async function prepareAcquisitionCase(id){
 const sample=acquisitionCases.find(c=>c.id===id);
 const prepared=await createCheckpoint(sample?'hub-d03':id,loadDocument);
 const input=structuredClone(acquisitionPreview);
 if(sample?.state==='empty')input.offers=[];
 return {...prepared,destinationPreview,acquisitionPreview:input,checkpoint:sample?
  {...prepared.checkpoint,screen:'collection',navigate:'collection',acquisitionState:sample.state}:prepared.checkpoint};
}
function openAcquisitionCase({prepared,root}){
 if(prepared.checkpoint.acquisitionState!=='complete')return;
 for(const selector of ['[data-action="stage"][data-id="offer-tide"]','[data-action="review"]','[data-action="commit"]']){
  const button=root.querySelector('#cw-acquisition-review '+selector);
  if(!button||button.disabled)throw Error('acquisition_case_changed');
  button.click();
 }
}
