const {formatHex,clampChroma,oklch}=require("culori");const {execFileSync}=require("child_process");
// dataviz skill 的 validate_palette.js，路徑依環境而定
const V=process.env.VALIDATE_PALETTE;if(!V){console.error("set VALIDATE_PALETTE=<path to validate_palette.js>");process.exit(1)}
const [mode,surface,spec]=process.argv.slice(2);const hues=JSON.parse(spec);
const Ls=mode=="light"?[0.44,0.47,0.5,0.53,0.56,0.6,0.64]:[0.5,0.53,0.56,0.6,0.63,0.66];
let best=null;
for(const a of Ls)for(const b of Ls)for(const c of Ls){
 const pal=[a,b,c].map((L,i)=>formatHex(clampChroma({mode:"oklch",l:L,c:hues[i][1],h:hues[i][0]},"oklch")));
 if(pal.some(h=>oklch(h).c<0.1))continue;
 let out;try{out=execFileSync("node",[V,pal.join(","),"--mode",mode,"--surface",surface,"--pairs","all"]).toString()}catch(e){continue}
 if(/\[WARN\] Contrast/.test(out))continue;const cvd=+out.match(/CVD separation.*?ΔE ([\d.]+)/)[1];const nv=+out.match(/Normal-vision floor.*?ΔE ([\d.]+)/)[1];
 const score=Math.min(cvd/8,nv/15);if(!best||score>best.score)best={score,pal,cvd,nv};
}
console.log(JSON.stringify(best));
