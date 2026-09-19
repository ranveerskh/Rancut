// Keep the supported configuration object intact (never turn it into a boolean).
export async function directH264Config(width,height,fps,quality,Encoder=globalThis.VideoEncoder){
 if(!Encoder)return null;
 const bitrate=quality==='Maximum'?60000000:quality==='Good'?30000000:45000000;
 for(const codec of ['avc1.640033','avc1.640032','avc1.4d4033']){
  try{const config={codec,width,height,bitrate,framerate:fps,hardwareAcceleration:'prefer-hardware',latencyMode:'quality',avc:{format:'annexb'}};
   const supported=await Encoder.isConfigSupported(config);if(supported.supported)return supported.config;
  }catch{}
 }
 return null;
}
export function sourceForRender(media,{exact=false,audio=false}={}){
 return !exact&&!audio&&media?.proxyUrl?{...media,url:media.proxyUrl}:media;
}
