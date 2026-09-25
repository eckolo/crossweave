'use strict';
const fs=require('node:fs'),path=require('node:path');
function build(){
 const assets={};
 for(const [id,file,width,height,position] of [['water','night-tide.webp',1920,1280,'50% 40%'],['shop','antique-shop.webp',1920,1280,'50% 50%'],['diver','diver-placeholder.webp',640,400,'50% 50%']]){
  assets[id]={id,width,height,position,src:'data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,file)).toString('base64')};
 }
 return fs.readFileSync(path.join(__dirname,'presentation.js'),'utf8').replace('__ART_ASSETS__',()=>JSON.stringify(assets));
}
module.exports={build};
