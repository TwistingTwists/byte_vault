"use strict";(self.webpackChunkbytevault=self.webpackChunkbytevault||[]).push([[641],{4806:(e,s,n)=>{n.r(s),n.d(s,{assets:()=>d,contentTitle:()=>c,default:()=>u,frontMatter:()=>r,metadata:()=>i,toc:()=>o});var i=n(281),t=n(4848),l=n(8453),a=n(4203);const r={slug:"ch-01-ddia",title:"Understanding DDIA - Chapter 01,02",date:new Date("2025-01-05T00:00:00.000Z"),authors:["abeeshake"],tags:["dist-sys"]},c=void 0,d={authorsImageUrls:[void 0]},o=[];function h(e){const s={li:"li",ol:"ol",p:"p",strong:"strong",ul:"ul",...(0,l.R)(),...e.components};return(0,t.jsxs)(a.Ay,{children:[(0,t.jsx)(a.vN,{children:(0,t.jsx)(s.p,{children:"Explain the key differences between relational databases and document databases.\nWhen would you choose one over the other?"})}),(0,t.jsxs)(a.yl,{children:[(0,t.jsx)(s.p,{children:"Here are the key differences between relational and document databases:"}),(0,t.jsxs)(s.ol,{children:["\n",(0,t.jsxs)(s.li,{children:[(0,t.jsx)(s.strong,{children:"Schema"}),":"]}),"\n"]}),(0,t.jsxs)(s.ul,{children:["\n",(0,t.jsx)(s.li,{children:"Relational: Rigid, predefined schema"}),"\n",(0,t.jsx)(s.li,{children:"Document: Flexible, schema-less design"}),"\n"]}),(0,t.jsxs)(s.ol,{start:"2",children:["\n",(0,t.jsxs)(s.li,{children:[(0,t.jsx)(s.strong,{children:"Data Model"}),":"]}),"\n"]}),(0,t.jsxs)(s.ul,{children:["\n",(0,t.jsx)(s.li,{children:"Relational: Data normalized across tables"}),"\n",(0,t.jsx)(s.li,{children:"Document: Denormalized, nested documents"}),"\n"]}),(0,t.jsxs)(s.ol,{start:"3",children:["\n",(0,t.jsxs)(s.li,{children:[(0,t.jsx)(s.strong,{children:"Scalability"}),":"]}),"\n"]}),(0,t.jsxs)(s.ul,{children:["\n",(0,t.jsx)(s.li,{children:"Relational: Vertical scaling primarily"}),"\n",(0,t.jsx)(s.li,{children:"Document: Easier horizontal scaling"}),"\n"]}),(0,t.jsx)(s.p,{children:"Choose Relational when:"}),(0,t.jsxs)(s.ul,{children:["\n",(0,t.jsx)(s.li,{children:"Data consistency is crucial"}),"\n",(0,t.jsx)(s.li,{children:"Complex queries and joins are needed"}),"\n",(0,t.jsx)(s.li,{children:"ACID compliance is required"}),"\n"]}),(0,t.jsx)(s.p,{children:"Choose Document when:"}),(0,t.jsxs)(s.ul,{children:["\n",(0,t.jsx)(s.li,{children:"Schema flexibility is needed"}),"\n",(0,t.jsx)(s.li,{children:"Rapid prototyping"}),"\n",(0,t.jsx)(s.li,{children:"Handling large amounts of unstructured data"}),"\n",(0,t.jsx)(s.li,{children:"Horizontal scaling is a priority"}),"\n"]})]})]})}function u(e={}){const{wrapper:s}={...(0,l.R)(),...e.components};return s?(0,t.jsx)(s,{...e,children:(0,t.jsx)(h,{...e})}):h(e)}},4203:(e,s,n)=>{n.d(s,{vN:()=>k,yl:()=>w,Ay:()=>C});var i=n(6540);const t="content_DCy4",l="wrapper_wXZ3",a="controls_KMOV",r="animationToggle_GfDu",c="flashcardContainer_KM2G",d="flashcard_qQbo",o="noAnimation_hL1g",h="front_ckcI",u="back_OyGB",x="flipped_FCte",m="header_g9M7",p="text_TAr2",g="flipInstruction_Cz25";var j=n(7481),b=n(5675);const y=e=>e&&0!==e.length?e.replace(/\r?\n/g,"\n &nbsp;"):"";var f=n(4848);const v=e=>(e=>"string"==typeof e)(e)?(0,f.jsx)(j.o,{className:"markdownContent",remarkPlugins:[b.A],children:y(e)}):e,k=e=>{let{children:s}=e;return(0,f.jsxs)("div",{className:t,children:[(0,f.jsx)("h4",{className:m,children:"Question"}),(0,f.jsx)("div",{className:p,children:v(s)})]})},w=e=>{let{children:s}=e;return(0,f.jsxs)("div",{className:t,children:[(0,f.jsx)("h4",{className:m,children:"Solution"}),(0,f.jsx)("div",{className:p,children:v(s)})]})},C=e=>{let{children:s}=e;const[n,t]=(0,i.useState)(!1),[m,p]=(0,i.useState)(!0),j=i.Children.toArray(s).find((e=>i.isValidElement(e)&&e.type===k)),b=i.Children.toArray(s).find((e=>i.isValidElement(e)&&e.type===w));return(0,f.jsxs)("div",{className:l,children:[(0,f.jsx)("div",{className:a,children:(0,f.jsxs)("label",{className:r,children:[(0,f.jsx)("input",{type:"checkbox",checked:m,onChange:e=>p(e.target.checked)}),(0,f.jsx)("span",{children:"Enable Animation"})]})}),(0,f.jsx)("div",{className:c,children:(0,f.jsxs)("div",{className:`${d} ${n?x:""} ${m?"":o}`,onClick:()=>{t(!n)},children:[(0,f.jsxs)("div",{className:h,children:[j,(0,f.jsx)("div",{className:g,children:"Click to Flip"})]}),(0,f.jsxs)("div",{className:u,children:[b,(0,f.jsx)("div",{className:g,children:"Click to Flip"})]})]})})]})}},281:e=>{e.exports=JSON.parse('{"permalink":"/byte_vault/blog/ch-01-ddia","source":"@site/blog/2025-01-05-ch-01-ddia.mdx","title":"Understanding DDIA - Chapter 01,02","description":"Explain the key differences between relational databases and document databases.","date":"2025-01-05T00:00:00.000Z","tags":[{"inline":false,"label":"Distributed Systems","permalink":"/byte_vault/blog/tags/dist-sys","description":"All things distributed systems"}],"readingTime":0.62,"hasTruncateMarker":false,"authors":[{"name":"Abhishek Tripathi","title":"Curiosity brings awareness.","url":"https://github.com/TwistingTwists","page":{"permalink":"/byte_vault/blog/authors/abeeshake"},"socials":{"x":"https://x.com/twistin456","github":"https://github.com/TwistingTwists"},"imageURL":"https://github.com/TwistingTwists.png","key":"abeeshake"}],"frontMatter":{"slug":"ch-01-ddia","title":"Understanding DDIA - Chapter 01,02","date":"2025-01-05T00:00:00.000Z","authors":["abeeshake"],"tags":["dist-sys"]},"unlisted":false,"nextItem":{"title":"Deep Flattening in Rust - Using Recursive Types ","permalink":"/byte_vault/blog/deep-flattening-in-rust-using-recursive-types"}}')}}]);