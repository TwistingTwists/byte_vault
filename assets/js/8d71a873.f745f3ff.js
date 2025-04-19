"use strict";(self.webpackChunkbytevault=self.webpackChunkbytevault||[]).push([[126],{9819:(e,t,s)=>{s.r(t),s.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>h,frontMatter:()=>a,metadata:()=>n,toc:()=>l});var n=s(1923),r=s(4848),i=s(8453);const a={slug:"rust-tips-tricks",title:"Rust tricks for the average developer (me)",date:new Date("2025-01-18T00:00:00.000Z"),draft:!1,authors:["abeeshake"],tags:["rust"]},o=void 0,c={authorsImageUrls:[void 0]},l=[{value:"001 : <code>&amp;str</code> and <code>AsRef&lt;OsStr&gt;</code>",id:"001--str-and-asrefosstr",level:3}];function d(e){const t={code:"code",h3:"h3",p:"p",pre:"pre",strong:"strong",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)(t.h3,{id:"001--str-and-asrefosstr",children:["001 : ",(0,r.jsx)(t.code,{children:"&str"})," and ",(0,r.jsx)(t.code,{children:"AsRef<OsStr>"})]}),"\n",(0,r.jsx)(t.p,{children:"The change from:"}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-rust",children:"pub fn load_extension(&self, path: &str) -> Result<()>\n"})}),"\n",(0,r.jsx)(t.p,{children:"to:"}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-rust",children:"pub fn load_extension<P: AsRef<std::ffi::OsStr>>(&self, path: P) -> Result<()>\n"})}),"\n",(0,r.jsxs)(t.p,{children:["improves flexibility and usability. The original function only accepted ",(0,r.jsx)(t.code,{children:"&str"}),", requiring explicit conversion for types like ",(0,r.jsx)(t.code,{children:"String"}),", ",(0,r.jsx)(t.code,{children:"PathBuf"}),", or ",(0,r.jsx)(t.code,{children:"Path"}),". The updated version uses a generic parameter ",(0,r.jsx)(t.code,{children:"P"})," with the ",(0,r.jsx)(t.code,{children:"AsRef<std::ffi::OsStr>"})," trait, allowing it to accept any type that can be referenced as an ",(0,r.jsx)(t.code,{children:"OsStr"}),", such as ",(0,r.jsx)(t.code,{children:"&str"}),", ",(0,r.jsx)(t.code,{children:"String"}),", ",(0,r.jsx)(t.code,{children:"Path"}),", or ",(0,r.jsx)(t.code,{children:"PathBuf"}),"."]}),"\n",(0,r.jsx)(t.p,{children:(0,r.jsx)(t.strong,{children:"Original Implementation:"})}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-rust",children:'use std::path::Path;\n\nlet path_str = String::from("/some/path");\nlet path_ref = Path::new("/another/path");\n\n// Example 1: Using String\ninstance.load_extension(path_str);\n\n// Example 2: Using &Path\ninstance.load_extension(&path_ref);\n\n// Example 3: Using Path directly\ninstance.load_extension(Path::new("/yet/another/path"));\n\n'})}),"\n",(0,r.jsx)(t.p,{children:"This reduces boilerplate and improves compatibility with different path types."})]})}function h(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(d,{...e})}):d(e)}},8453:(e,t,s)=>{s.d(t,{R:()=>a,x:()=>o});var n=s(6540);const r={},i=n.createContext(r);function a(e){const t=n.useContext(i);return n.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:a(e.components),n.createElement(i.Provider,{value:t},e.children)}},1923:e=>{e.exports=JSON.parse('{"permalink":"/byte_vault/rust-tips-tricks","source":"@site/blog/2025-01-18-rust-tip-tricks.mdx","title":"Rust tricks for the average developer (me)","description":"001 : &str and AsRef","date":"2025-01-18T00:00:00.000Z","tags":[{"inline":false,"label":"Rust","permalink":"/byte_vault/tags/rust","description":"Rust lang"}],"readingTime":0.62,"hasTruncateMarker":false,"authors":[{"name":"Abhishek Tripathi","title":"Curiosity brings awareness.","url":"https://github.com/TwistingTwists","page":{"permalink":"/byte_vault/authors/abeeshake"},"socials":{"x":"https://x.com/twistin456","github":"https://github.com/TwistingTwists"},"imageURL":"https://github.com/TwistingTwists.png","key":"abeeshake"}],"frontMatter":{"slug":"rust-tips-tricks","title":"Rust tricks for the average developer (me)","date":"2025-01-18T00:00:00.000Z","draft":false,"authors":["abeeshake"],"tags":["rust"]},"unlisted":false,"prevItem":{"title":"String interning in Rust","permalink":"/byte_vault/string-interning-rust"},"nextItem":{"title":"Streaming HTTP to Disk","permalink":"/byte_vault/streaming-http-to-disk"}}')}}]);