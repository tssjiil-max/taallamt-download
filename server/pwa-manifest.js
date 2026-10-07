// Preserve the existing guardian-link authentication when installed. Never cache personal manifests.
export default function handler(req,res){
 const query=new URL(req.url,'https://localhost').searchParams;
 const access=new URLSearchParams();
 for(const key of ['studentId','invite','inviteToken']){const value=query.get(key);if(value&&value.length<=2048)access.set(key,value);}
 const icons=[192,512].flatMap(n=>[false,true].map(mask=>({src:`/pwa/student-${n}${mask?'-maskable':''}.png`,sizes:`${n}x${n}`,type:'image/png',purpose:mask?'maskable':'any'})));
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','application/manifest+json');res.setHeader('Referrer-Policy','no-referrer');
 res.status(200).json({id:'/pwa/student',name:'تعلّمت',short_name:'تعلّمت',start_url:'/student'+(access.size?'?'+access.toString():''),scope:'/student',display:'standalone',lang:'ar',dir:'rtl',theme_color:'#c9e9fe',background_color:'#d9f1ff',icons});
}
