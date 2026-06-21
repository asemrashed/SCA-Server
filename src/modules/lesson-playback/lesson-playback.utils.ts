export type ParsedVideoSource =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'vimeo'; videoId: string }
  | { kind: 'file'; src: string }

export function parseVideoUrl(url: string): ParsedVideoSource | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (youtubeMatch?.[1]) return { kind: 'youtube', videoId: youtubeMatch[1] }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch?.[1]) return { kind: 'vimeo', videoId: vimeoMatch[1] }

  const embedYoutube = trimmed.match(/embed\/([a-zA-Z0-9_-]{11})/)
  if (trimmed.includes('youtube.com/embed') && embedYoutube?.[1]) {
    return { kind: 'youtube', videoId: embedYoutube[1] }
  }

  const embedVimeo = trimmed.match(/video\/(\d+)/)
  if (trimmed.includes('player.vimeo.com') && embedVimeo?.[1]) {
    return { kind: 'vimeo', videoId: embedVimeo[1] }
  }

  return { kind: 'file', src: trimmed }
}

export function buildYoutubeBridgeHtml(videoId: string, clientOrigin: string, autoplay: boolean): string {
  const autoplayFlag = autoplay ? '1' : '0'
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}iframe{border:0;width:100%;height:100%}</style></head>
<body>
<iframe id="yt" allow="accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture" sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="strict-origin-when-cross-origin"></iframe>
<script>
(function(){
  var id=${JSON.stringify(videoId)};
  var origin=${JSON.stringify(clientOrigin)};
  var params=new URLSearchParams({autoplay:${JSON.stringify(autoplayFlag)},modestbranding:'1',rel:'0',fs:'0',disablekb:'1',controls:'0',iv_load_policy:'3',playsinline:'1',enablejsapi:'1',origin:origin,widget_referrer:origin});
  var yt=document.getElementById('yt');
  yt.src='https://www.youtube-nocookie.com/embed/'+id+'?'+params.toString();
  window.addEventListener('message',function(e){
    if(e.source!==window.parent)return;
    try{yt.contentWindow.postMessage(e.data,'https://www.youtube-nocookie.com');}catch(_){}
  });
  window.addEventListener('message',function(e){
    if(!e.origin||!e.origin.includes('youtube'))return;
    try{window.parent.postMessage(e.data,origin);}catch(_){}
  });
  yt.addEventListener('load',function(){
    setTimeout(function(){
      try{
        yt.contentWindow.postMessage(JSON.stringify({event:'listening',id:id}),'https://www.youtube-nocookie.com');
        ['onReady','onStateChange'].forEach(function(name){
          yt.contentWindow.postMessage(JSON.stringify({event:'command',func:'addEventListener',args:[name]}),'https://www.youtube-nocookie.com');
        });
      }catch(_){}
    },50);
  });
})();
</script>
</body></html>`
}

export function buildVimeoBridgeHtml(videoId: string, autoplay: boolean): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden;background:#000}iframe{border:0;width:100%;height:100%}</style></head>
<body>
<iframe id="vm" allow="autoplay;encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>
<script src="https://player.vimeo.com/api/player.js"></script>
<script>
(function(){
  var id=${JSON.stringify(videoId)};
  var autoplay=${autoplay ? 'true' : 'false'};
  var frame=document.getElementById('vm');
  frame.src='https://player.vimeo.com/video/'+id+'?controls=0&title=0&byline=0&portrait=0&dnt=1&transparent=0'+(autoplay?'&autoplay=1':'');
  var player=null;
  function ensurePlayer(cb){if(player){cb(player);return;}if(!window.Vimeo||!window.Vimeo.Player){setTimeout(function(){ensurePlayer(cb);},50);return;}player=new window.Vimeo.Player(frame);cb(player);}
  window.addEventListener('message',function(e){
    if(e.source!==window.parent||!e.data||e.data.channel!=='vimeo-bridge')return;
    ensurePlayer(function(p){
      var cmd=e.data.command,args=e.data.args||[];
      var fn=p[cmd]; if(typeof fn!=='function')return;
      var result=fn.apply(p,args);
      if(result&&typeof result.then==='function'){result.then(function(v){window.parent.postMessage({channel:'vimeo-bridge',id:e.data.id,result:v},'*');}).catch(function(err){window.parent.postMessage({channel:'vimeo-bridge',id:e.data.id,error:String(err)},'*');});}
      else {window.parent.postMessage({channel:'vimeo-bridge',id:e.data.id,result:result},'*');}
    });
  });
  ensurePlayer(function(p){
    p.on('play',function(){window.parent.postMessage({channel:'vimeo-event',event:'play'},'*');});
    p.on('pause',function(){window.parent.postMessage({channel:'vimeo-event',event:'pause'},'*');});
    p.on('ended',function(){window.parent.postMessage({channel:'vimeo-event',event:'ended'},'*');});
    window.parent.postMessage({channel:'vimeo-event',event:'ready'},'*');
  });
})();
</script>
</body></html>`
}
