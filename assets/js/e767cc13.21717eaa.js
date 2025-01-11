"use strict";(self.webpackChunkbytevault=self.webpackChunkbytevault||[]).push([[6504],{9007:(e,t,s)=>{s.r(t),s.d(t,{assets:()=>l,contentTitle:()=>r,default:()=>h,frontMatter:()=>o,metadata:()=>n,toc:()=>u});var n=s(1006),a=s(4848),i=s(8453);const o={slug:"streaming-http-to-disk",title:"Streaming HTTP to Disk",date:new Date("2025-01-10T00:00:00.000Z"),authors:["abeeshake"],tags:["rust"]},r=void 0,l={authorsImageUrls:[void 0]},u=[];function c(e){const t={code:"code",mermaid:"mermaid",p:"p",...(0,i.R)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(t.p,{children:"HTTP responses can be quite large and memory consumption can be a concern. In\nsome cases, it is important to be able to handle large responses without\nloading the entire response into memory."}),"\n",(0,a.jsx)(t.p,{children:"One such scenario is when you want to download a large file from a server. If\nyou were to load the entire file into memory, it would require a large amount\nof memory and would be inefficient. Instead, you can use a streaming approach\nto download the file directly to disk."}),"\n",(0,a.jsxs)(t.p,{children:["This example will show you how to do just that using the ",(0,a.jsx)(t.code,{children:"reqwest"})," and ",(0,a.jsx)(t.code,{children:"tokio"}),"\ncrates (Rust). Here is the rough flow."]}),"\n",(0,a.jsx)(t.mermaid,{value:'flowchart TD\n    A["Start: Initiate Download"] --\x3e B["Send GET request using reqwest client"]\n    B --\x3e C["Receive Response object"]\n    C --\x3e D["Convert response body to byte stream using bytes_stream()"]\n    D --\x3e E["Iterate over each chunk asynchronously"]\n    E --\x3e F["Write each chunk to file using tokio::fs::File"]\n    F --\x3e G{"More chunks?"}\n    G -- Yes --\x3e E\n    G -- No --\x3e H["End: Data Saved to Disk"]\n    \n    style A fill:#f9f,stroke:#333,stroke-width:2px\n    style H fill:#bbf,stroke:#333,stroke-width:2px\n'})]})}function h(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,a.jsx)(t,{...e,children:(0,a.jsx)(c,{...e})}):c(e)}},1006:e=>{e.exports=JSON.parse('{"permalink":"/byte_vault/blog/streaming-http-to-disk","source":"@site/blog/2025-01-10-http-streaming-to-disk.mdx","title":"Streaming HTTP to Disk","description":"HTTP responses can be quite large and memory consumption can be a concern. In","date":"2025-01-10T00:00:00.000Z","tags":[{"inline":false,"label":"Rust","permalink":"/byte_vault/blog/tags/rust","description":"Rust lang"}],"readingTime":3.42,"hasTruncateMarker":true,"authors":[{"name":"Abhishek Tripathi","title":"Curiosity brings awareness.","url":"https://github.com/TwistingTwists","page":{"permalink":"/byte_vault/blog/authors/abeeshake"},"socials":{"x":"https://x.com/twistin456","github":"https://github.com/TwistingTwists"},"imageURL":"https://github.com/TwistingTwists.png","key":"abeeshake"}],"frontMatter":{"slug":"streaming-http-to-disk","title":"Streaming HTTP to Disk","date":"2025-01-10T00:00:00.000Z","authors":["abeeshake"],"tags":["rust"]},"unlisted":false,"nextItem":{"title":"Understanding DDIA - Chapter 01,02","permalink":"/byte_vault/blog/ch-01-ddia"}}')}}]);