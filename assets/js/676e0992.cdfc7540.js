"use strict";(self.webpackChunkbytevault=self.webpackChunkbytevault||[]).push([[3985],{2945:(e,s,r)=>{r.r(s),r.d(s,{assets:()=>m,contentTitle:()=>u,default:()=>p,frontMatter:()=>h,metadata:()=>t,toc:()=>x});var t=r(7203),n=r(4848),a=r(8453),i=r(5896),l=r(5782),o=r(157),d=r(9489),c=r(1096);const h={slug:"tokio-internals-visualised",title:"Understanding Eventloops (Tokio Internals)",date:new Date("2025-04-19T00:00:00.000Z"),authors:["abeeshake"],tags:["rust","tokio","async","eventloop"],draft:!1},u=void 0,m={authorsImageUrls:[void 0]},x=[{value:"Prelude",id:"prelude",level:2},{value:"Multi-Threaded Event Loop / Server",id:"multi-threaded-event-loop--server",level:2},{value:"Phase 0: The Problem",id:"phase-0-the-problem",level:2},{value:"The Thread-Per-Connection Resource Drain",id:"the-thread-per-connection-resource-drain",level:3}];function g(e){const s={code:"code",em:"em",h2:"h2",h3:"h3",li:"li",ol:"ol",p:"p",strong:"strong",ul:"ul",...(0,a.R)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(c.A,{toc:x}),"\n",(0,n.jsx)(s.h2,{id:"prelude",children:"Prelude"}),"\n",(0,n.jsx)(s.p,{children:"This is the first post in a four part series that will provide an understanding of the mechanics behind the Tokio runtime in Rust. This post focuses on the challenges in a multi-threaded event loop that force us to think of async runtimes like Tokio."}),"\n",(0,n.jsx)(s.p,{children:"Index of the four part series:"}),"\n",(0,n.jsxs)(s.ol,{children:["\n",(0,n.jsx)(s.li,{children:"Visualizing Tokio Internals: Part I - Multi-Threaded Event Loop / Server"}),"\n",(0,n.jsx)(s.li,{children:"Visualizing Tokio Internals: Part II - Reactor"}),"\n",(0,n.jsx)(s.li,{children:"Visualizing Tokio Internals: Part III - Wakers"}),"\n",(0,n.jsx)(s.li,{children:"Visualizing Tokio Internals: Part IV - Executors"}),"\n"]}),"\n",(0,n.jsx)(s.h2,{id:"multi-threaded-event-loop--server",children:"Multi-Threaded Event Loop / Server"}),"\n",(0,n.jsx)(s.p,{children:"What challenges in a multi-threaded event loop force us to think of async runtimes like Tokio?"}),"\n",(0,n.jsx)(s.h2,{id:"phase-0-the-problem",children:"Phase 0: The Problem"}),"\n",(0,n.jsx)(l.A,{question:"Why do we need async runtimes like Tokio?",id:"why-tokio",children:(0,n.jsxs)(s.ul,{children:["\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Resource Efficiency:"})," Traditional thread-per-connection models waste system resources"]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Scalability:"})," Async enables handling thousands of connections with minimal overhead"]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Performance:"})," Event-driven architecture reduces context switching and memory usage"]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Cost-Effective:"})," Better resource utilization means lower infrastructure costs"]}),"\n"]})}),"\n","\n",(0,n.jsx)(s.p,{children:"Modern applications, especially network services, need to handle many things concurrently. Imagine a web server handling thousands of client connections simultaneously."}),"\n",(0,n.jsx)(s.p,{children:"A naive approach is to dedicate one Operating System (OS) thread to each connection. Let's see why this doesn't scale well."}),"\n",(0,n.jsx)(s.h3,{id:"the-thread-per-connection-resource-drain",children:"The Thread-Per-Connection Resource Drain"}),"\n",(0,n.jsx)(s.p,{children:"The visualization below shows resource consumption (CPU/Memory) and throughput limits of a blocking thread-per-connection model."}),"\n",(0,n.jsxs)(o.A,{summary:"How a thread-per-connection server behaves as load increases",id:"thread-per-connection",className:"mb-4",children:[(0,n.jsx)(s.p,{children:(0,n.jsx)(s.strong,{children:"Description:"})}),(0,n.jsxs)(s.p,{children:["Imagine a dashboard resembling ",(0,n.jsx)(s.code,{children:"htop"})," or Task Manager:"]}),(0,n.jsxs)(s.ol,{children:["\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"CPU Usage:"})," Bars representing individual CPU cores."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Memory Usage:"})," A single bar showing total RAM consumption."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Active Threads:"})," A counter or list showing running OS threads."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Requests/Second:"})," A throughput meter."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Incoming Requests Queue:"})," A visual queue of pending connections."]}),"\n"]}),(0,n.jsx)(s.p,{children:(0,n.jsx)(s.strong,{children:"Simulation:"})}),(0,n.jsxs)(s.ul,{children:["\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Start:"})," The server starts. CPU/Memory usage is low. Throughput is 0. Few base threads exist."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Low Load:"})," Simulate a few incoming connections (~10). For each, a new OS thread is created.","\n",(0,n.jsxs)(s.ul,{children:["\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.em,{children:"Visual:"})," Active Threads count increases slightly. Memory usage ticks up slightly. CPU usage might blip as threads start but stays relatively low if connections are mostly idle. Throughput matches the request rate."]}),"\n"]}),"\n"]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"High Load:"})," Simulate hundreds or thousands of incoming connections. Many connections involve waiting for network I/O (reading request body, waiting for database, sending response).","\n",(0,n.jsxs)(s.ul,{children:["\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.em,{children:"Visual:"}),"\n",(0,n.jsxs)(s.ul,{children:["\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Active Threads:"})," The count explodes. Each thread requires kernel resources and its own stack (~MBs)."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Memory Usage:"})," The Memory bar shoots up dramatically, potentially hitting system limits."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"CPU Usage:"})," CPU bars likely thrash. Even if threads are mostly ",(0,n.jsx)(s.em,{children:"waiting"})," (blocked on I/O), the OS spends significant time ",(0,n.jsx)(s.em,{children:"context switching"})," between them. This is overhead, not useful work."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Requests Queue:"})," The incoming requests queue grows rapidly because threads are created, but many quickly block on I/O. The server struggles to accept new connections."]}),"\n",(0,n.jsxs)(s.li,{children:[(0,n.jsx)(s.strong,{children:"Requests/Second:"})," The throughput meter hits a plateau far below the incoming request rate, possibly even decreasing as context-switching overhead dominates."]}),"\n"]}),"\n"]}),"\n"]}),"\n"]}),"\n"]})]}),"\n",(0,n.jsx)(i.A,{className:"mt-8"}),"\n",(0,n.jsx)(d.A,{children:(0,n.jsxs)(s.p,{children:["We need a way to handle multiple waiting tasks concurrently without needing a dedicated OS thread for each one ",(0,n.jsx)("em",{children:"while it's waiting"}),". This leads to asynchronous programming."]})})]})}function p(e={}){const{wrapper:s}={...(0,a.R)(),...e.components};return s?(0,n.jsx)(s,{...e,children:(0,n.jsx)(g,{...e})}):g(e)}},9489:(e,s,r)=>{r.d(s,{A:()=>n});r(6540);var t=r(4848);const n=e=>{let{children:s}=e;return(0,t.jsxs)("div",{className:"bg-orange-100 dark:bg-orange-900 p-6 rounded-xl mt-8 mb-4 border-l-4 border-orange-400 dark:border-orange-500 shadow-sm",children:[(0,t.jsx)("span",{className:"block font-bold text-lg text-orange-900 dark:text-orange-200 mb-2",children:"Insight"}),(0,t.jsx)("span",{className:"text-base text-gray-900 dark:text-gray-100",children:s})]})}},5782:(e,s,r)=>{r.d(s,{A:()=>a});var t=r(6540),n=r(4848);const a=e=>{let{question:s,children:r,id:a=`learning-objective-${s}`,defaultExpanded:i=!1}=e;const[l,o]=(0,t.useState)(i);return(0,n.jsx)("div",{className:"my-3 sm:my-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg overflow-hidden shadow-sm dark:shadow-blue-900/5 border-l-4 border-blue-400 dark:border-blue-600",children:(0,n.jsxs)("div",{className:"p-3 sm:p-4 space-y-2 sm:space-y-3",children:[(0,n.jsxs)("div",{className:"flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-3",children:[(0,n.jsxs)("div",{className:"flex items-center gap-2 sm:gap-3 w-full sm:w-auto",children:[(0,n.jsxs)("div",{className:"flex-shrink-0 p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md group relative",children:[(0,n.jsx)("svg",{className:"w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor","aria-label":"Learning Objective",children:(0,n.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"})}),(0,n.jsx)("div",{className:"absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 text-2xs sm:text-xs text-white bg-gray-800 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none",children:"Learning Objective"})]}),(0,n.jsxs)("div",{className:"flex-grow min-w-0",children:[(0,n.jsx)("div",{className:"text-xs sm:text-xs text-gray-600 dark:text-gray-400 mb-1 mt-0",children:"After reading this you will be able to answer:"}),(0,n.jsx)("p",{className:"text-sm sm:text-base font-medium text-blue-900 dark:text-blue-100 truncate",children:s})]})]}),(0,n.jsx)("button",{id:`${a}-button`,onClick:()=>o((e=>!e)),className:" flex items-center gap-1 px-2 py-1 ml-auto text-2xs sm:text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 focus:outline-none ","aria-expanded":l,"aria-controls":a,children:l?(0,n.jsxs)(n.Fragment,{children:["Hide",(0,n.jsx)("svg",{className:"w-2.5 h-2.5 sm:w-3 sm:h-3",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,n.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M5 15l7-7 7 7"})})]}):(0,n.jsxs)(n.Fragment,{children:["Show",(0,n.jsx)("svg",{className:"w-2.5 h-2.5 sm:w-3 sm:h-3",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,n.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]})})]}),(0,n.jsx)("div",{id:a,role:"region","aria-labelledby":`${a}-button`,className:`\n            overflow-hidden transition-all duration-300 ease-in-out\n            ${l?"max-h-[500px] opacity-100":"max-h-0 opacity-0"}\n          `,children:(0,n.jsx)("div",{className:"pt-2 border-t border-blue-100 dark:border-blue-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300",children:r})})]})})}},157:(e,s,r)=>{r.d(s,{A:()=>a});var t=r(6540),n=r(4848);function a(e){let{summary:s,children:r,id:a}=e;const[i,l]=(0,t.useState)(!1);return(0,n.jsxs)("div",{className:"my-4 border rounded-lg border-gray-200 dark:border-gray-800",children:[(0,n.jsxs)("button",{onClick:()=>l(!i),className:"w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 dark:bg-gray-900 rounded-t-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200",id:a,"aria-expanded":i,children:[(0,n.jsx)("span",{className:"font-medium text-gray-900 dark:text-gray-100",children:s}),(0,n.jsx)("svg",{className:"w-5 h-5 transform transition-transform duration-200 "+(i?"rotate-180":""),fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,n.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]}),(0,n.jsx)("div",{className:`\n          overflow-hidden transition-all duration-300 ease-in-out\n          ${i?"max-h-[2000px] opacity-100":"max-h-0 opacity-0"}\n        `,children:(0,n.jsx)("div",{className:"p-4 prose dark:prose-invert max-w-none",children:r})})]})}},5896:(e,s,r)=>{r.d(s,{A:()=>i});var t=r(6540),n=r(4685),a=r(4848);const i=()=>{const[e,s]=(0,t.useState)(10),[r,i]=(0,t.useState)(!1),[l,o]=(0,t.useState)(1),[d,c]=(0,t.useState)([]),[h,u]=(0,t.useState)(!1),m=(0,t.useRef)(null),[x,g]=(0,t.useState)({cpuCores:8,cpuUsage:[5,3,4,2,5,3,2,4],memoryUsage:8,threadCount:12,requestsPerSecond:0,queueSize:0,cpuAverage:0,threadCountPercentage:0,throughputPercentage:0,queuePercentage:0}),p=(0,t.useRef)(null),j=()=>{if(r){s((e=>{let s;s=e<100?5*l:e<500?20*l:Math.floor(.1*e*l);const r=e+s;return Math.min(Math.floor(r),500)}));const e=500/l;p.current=setTimeout(j,e)}};(0,t.useEffect)((()=>(r?p.current=setTimeout(j,500/l):p.current&&clearTimeout(p.current),()=>{p.current&&clearTimeout(p.current)})),[r,l,j]),(0,t.useEffect)((()=>{const s=(e=>{const s=e>500?1.5:e>100?1.2:1,r=Math.min(1*e,5e3),t=2*r,n=Math.min(Math.floor(t/16e3*100),100);let a=[];const i=Math.pow(e/100,1.5)*s;let l=8*Math.min(Math.floor(1*e*.5+5*i),100);for(let u=0;u<8;u++){const e=.7+.6*Math.random(),s=l/(8-u),r=Math.min(Math.floor(s*e),100);a.push(r),l-=r}let o=0;o=e<=100?.9*e:90+.2*(e-100)*Math.exp(-e/800);const d=Math.min(Math.floor(o/1.2),100),c=e<=100?Math.floor(.1*e):Math.floor(10+Math.pow(e-100,1.5)/100),h=Math.min(Math.floor(r/5e3*100),100);return{cpuCores:8,cpuUsage:a,cpuAverage:Math.floor(a.reduce(((e,s)=>e+s),0)/a.length),memoryUsage:n,threadCount:r,threadCountPercentage:h,requestsPerSecond:Math.floor(o),throughputPercentage:d,queueSize:c,queuePercentage:Math.min(Math.floor(c/1e3*100),100)}})(e);g(s),c((r=>{const t=[...r,{connections:e,cpuAverage:s.cpuAverage,memoryUsage:s.memoryUsage,threadCountPercentage:s.threadCountPercentage,throughputPercentage:s.throughputPercentage,queuePercentage:s.queuePercentage}];return t.length>100?t.slice(t.length-100):t}))}),[e]);const b=e=>e.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",");return(0,a.jsxs)("div",{className:"visualization-container bg-gray-100 dark:bg-gray-900 p-6 rounded-lg shadow-md space-y-6",children:[(0,a.jsxs)("div",{className:"bg-black dark:bg-gray-800 text-green-400 dark:text-green-300 p-4 rounded font-mono text-sm h-64 overflow-y-auto",children:[(0,a.jsxs)("div",{className:"mb-2",children:[(0,a.jsx)("span",{className:"text-blue-400 dark:text-blue-300",children:"htop - "}),(0,a.jsx)("span",{className:"text-white dark:text-gray-100",children:"Thread-Per-Connection Server"})]}),(0,a.jsxs)("div",{className:"mb-4",children:[(0,a.jsxs)("div",{className:"flex justify-between mb-1",children:[(0,a.jsx)("span",{children:"Active Connections:"}),(0,a.jsx)("span",{className:e>500?"text-red-500":e>100?"text-yellow-400 dark:text-yellow-300":"",children:b(e)})]}),(0,a.jsxs)("div",{className:"flex justify-between mb-1",children:[(0,a.jsx)("span",{children:"Threads:"}),(0,a.jsx)("span",{className:x.threadCount>1e3?"text-red-500":x.threadCount>200?"text-yellow-400 dark:text-yellow-300":"",children:b(x.threadCount)})]}),(0,a.jsxs)("div",{className:"flex justify-between mb-1",children:[(0,a.jsx)("span",{children:"Requests/sec:"}),(0,a.jsx)("span",{className:x.requestsPerSecond<x.threadCount/5?"text-red-500":x.requestsPerSecond<x.threadCount/2?"text-yellow-400 dark:text-yellow-300":"text-green-300 dark:text-green-400",children:b(x.requestsPerSecond)})]}),(0,a.jsxs)("div",{className:"flex justify-between mb-1",children:[(0,a.jsx)("span",{children:"Request Queue:"}),(0,a.jsx)("span",{className:x.queueSize>100?"text-red-500":x.queueSize>20?"text-yellow-400 dark:text-yellow-300":"",children:b(x.queueSize)})]})]}),(0,a.jsxs)("div",{className:"mb-4",children:[(0,a.jsx)("div",{className:"text-white dark:text-gray-100 mb-1",children:"CPU Usage"}),x.cpuUsage.map(((e,s)=>(0,a.jsx)("div",{className:"mb-2",children:(0,a.jsxs)("div",{className:"flex items-center justify-between",children:[(0,a.jsx)("span",{className:"w-12",children:`CPU ${s}`}),(0,a.jsx)("div",{className:"w-full bg-gray-700 dark:bg-gray-600 h-4 ml-2 mr-2 rounded-sm",children:(0,a.jsx)("div",{className:"h-full rounded-sm "+(e>90?"bg-red-500":e>70?"bg-yellow-400 dark:bg-yellow-300":"bg-green-500 dark:bg-green-400"),style:{width:`${e}%`}})}),(0,a.jsx)("span",{className:"w-8 text-right",children:`${e}%`})]})},s))),(0,a.jsxs)("div",{className:"flex items-center justify-between mt-1",children:[(0,a.jsx)("span",{className:"w-12",children:"Average:"}),(0,a.jsx)("div",{className:"w-full bg-gray-700 dark:bg-gray-600 h-4 ml-2 mr-2 rounded-sm",children:(0,a.jsx)("div",{className:"h-full rounded-sm "+(x.cpuAverage>90?"bg-red-500":x.cpuAverage>70?"bg-yellow-400 dark:bg-yellow-300":"bg-green-500 dark:bg-green-400"),style:{width:`${x.cpuAverage}%`}})}),(0,a.jsx)("span",{className:"w-8 text-right",children:`${x.cpuAverage}%`})]})]}),(0,a.jsxs)("div",{className:"mb-4",children:[(0,a.jsx)("div",{className:"text-white dark:text-gray-100 mb-1",children:"Memory Usage"}),(0,a.jsxs)("div",{className:"flex items-center justify-between",children:[(0,a.jsx)("span",{className:"w-12",children:"Mem"}),(0,a.jsx)("div",{className:"w-full bg-gray-700 dark:bg-gray-600 h-4 ml-2 mr-2 rounded-sm",children:(0,a.jsx)("div",{className:"h-full rounded-sm "+(x.memoryUsage>90?"bg-red-500":x.memoryUsage>70?"bg-yellow-400 dark:bg-yellow-300":"bg-blue-500 dark:bg-blue-400"),style:{width:`${x.memoryUsage}%`}})}),(0,a.jsx)("span",{className:"w-8 text-right",children:`${x.memoryUsage}%`})]})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("div",{className:"text-white dark:text-gray-100 mb-1",children:"Top Threads"}),(0,a.jsxs)("div",{className:"grid grid-cols-12 text-xs mb-1 border-b border-gray-700 dark:border-gray-600",children:[(0,a.jsx)("div",{className:"col-span-1",children:"PID"}),(0,a.jsx)("div",{className:"col-span-3",children:"USER"}),(0,a.jsx)("div",{className:"col-span-1",children:"PR"}),(0,a.jsx)("div",{className:"col-span-1",children:"NI"}),(0,a.jsx)("div",{className:"col-span-2",children:"CPU%"}),(0,a.jsx)("div",{className:"col-span-2",children:"MEM%"}),(0,a.jsx)("div",{className:"col-span-2",children:"CMD"})]}),e>0&&Array.from({length:Math.min(10,x.threadCount)}).map(((s,r)=>{const t=Math.min(99,Math.floor(20*Math.random())+(e>500?5:2)),n=Math.min(5,.2+.3*Math.random());return(0,a.jsxs)("div",{className:"grid grid-cols-12 text-xs mb-1",children:[(0,a.jsx)("div",{className:"col-span-1",children:1e3+r}),(0,a.jsx)("div",{className:"col-span-3",children:"server"}),(0,a.jsx)("div",{className:"col-span-1",children:"20"}),(0,a.jsx)("div",{className:"col-span-1",children:"0"}),(0,a.jsx)("div",{className:"col-span-2 "+(t>70?"text-red-400":""),children:t.toFixed(1)}),(0,a.jsx)("div",{className:"col-span-2",children:n.toFixed(1)}),(0,a.jsx)("div",{className:"col-span-2",children:"http-conn"})]},r)})),x.threadCount>10&&(0,a.jsxs)("div",{className:"text-gray-500 dark:text-gray-400 text-xs mt-1",children:["... and ",b(x.threadCount-10)," more threads"]})]})]}),(0,a.jsxs)("div",{className:"flex justify-between items-center",children:[(0,a.jsx)("h3",{className:"text-lg font-bold dark:text-gray-100",children:"Thread-Per-Connection Resource Monitor"}),(0,a.jsxs)("div",{className:"flex gap-4",children:[(0,a.jsx)("button",{ref:m,onClick:()=>{if(!r){const e=m.current;if(e){const s=e.getBoundingClientRect(),r=(s.left+s.width/2)/window.innerWidth,t=(s.top+s.height/2)/window.innerHeight;(0,n.A)({particleCount:100,spread:70,origin:{x:r,y:t},colors:["#22c55e","#3b82f6","#64748b","#ef4444","#a855f7"]})}}i(!r)},onMouseEnter:()=>u(!0),onMouseLeave:()=>u(!1),className:`\n              px-6 py-3 rounded-lg font-medium text-white\n              shadow-lg transform transition-all duration-200\n              ${r?"bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700":"bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"}\n              ${h?"scale-105 -translate-y-0.5":""}\n              active:scale-95 active:shadow-md\n              border border-white/10\n              hover:shadow-xl\n              hover:border-white/20\n              dark:border-white/20\n            `,children:(0,a.jsx)("span",{className:"flex items-center gap-2",children:r?(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("svg",{className:"w-5 h-5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,a.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M6 18L18 6M6 6l12 12"})}),"Stop Simulation"]}):(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)("svg",{className:"w-5 h-5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:[(0,a.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"}),(0,a.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})]}),"Start Simulation"]})})}),(0,a.jsx)("button",{onClick:()=>{i(!1),s(10),c([])},className:" px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg transform transition-all duration-200 hover:from-gray-700 hover:to-gray-800 hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 active:shadow-md border border-white/10 hover:border-white/20 dark:border-white/20 ",children:(0,a.jsxs)("span",{className:"flex items-center gap-2",children:[(0,a.jsx)("svg",{className:"w-5 h-5",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:(0,a.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Reset"]})})]})]}),(0,a.jsxs)("div",{className:"bg-white dark:bg-gray-800 p-4 rounded shadow space-y-6",children:[(0,a.jsxs)("div",{children:[(0,a.jsx)("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2",children:"Simulate Connection Load"}),(0,a.jsxs)("div",{className:"flex gap-4 items-center",children:[(0,a.jsx)("input",{type:"range",min:"1",max:"500",value:e,onChange:e=>{i(!1),s(parseInt(e.target.value))},className:"w-full"}),(0,a.jsx)("span",{className:"text-sm font-mono bg-gray-100 dark:bg-gray-900 dark:text-gray-100 p-1 rounded",children:b(e)})]})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2",children:"Simulation Speed"}),(0,a.jsxs)("div",{className:"flex gap-4 items-center",children:[(0,a.jsx)("span",{className:"text-xs",children:"Slow"}),(0,a.jsx)("input",{type:"range",min:"0.5",max:"5",step:"0.5",value:l,onChange:e=>o(parseFloat(e.target.value)),className:"w-full"}),(0,a.jsx)("span",{className:"text-xs",children:"Fast"}),(0,a.jsxs)("span",{className:"text-sm font-mono bg-gray-100 dark:bg-gray-900 dark:text-gray-100 p-1 rounded",children:[l,"x"]})]})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("h4",{className:"text-sm font-medium text-gray-700 dark:text-gray-200 mb-2",children:"Performance Impact"}),(0,a.jsxs)("div",{className:"relative h-64 border border-gray-300 dark:border-gray-600 rounded p-2",children:[(0,a.jsxs)("div",{className:"absolute bottom-0 left-0 right-0 border-t border-gray-300 dark:border-gray-600 flex justify-between px-2 text-xs text-gray-500 dark:text-gray-400",children:[(0,a.jsx)("div",{children:"0"}),(0,a.jsx)("div",{children:"100"}),(0,a.jsx)("div",{children:"200"}),(0,a.jsx)("div",{children:"300"}),(0,a.jsx)("div",{children:"400"}),(0,a.jsx)("div",{children:"500"})]}),(0,a.jsx)("div",{className:"absolute left-0 top-0 bottom-10 flex items-center",children:(0,a.jsx)("div",{className:"transform -rotate-90 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap",children:"Resource Utilization (%)"})}),(0,a.jsx)("div",{className:"absolute bottom-0 w-0.5 bg-red-500 h-full opacity-50",style:{left:e/500*100+"%",height:"calc(100% - 15px)"}}),(0,a.jsx)("div",{className:"w-full h-full",children:(()=>{if(d.length<2)return null;const e=e=>d.map(((s,r)=>(0===r?"M":"L")+`${s.connections/500*100},${100-100*s[e]/100}`)).join(" ");return(0,a.jsxs)("svg",{className:"w-full h-full",viewBox:"0 0 100 100",preserveAspectRatio:"none",children:[(0,a.jsx)("path",{d:e("cpuAverage"),fill:"none",stroke:"#22c55e",strokeWidth:"0.7"}),(0,a.jsx)("path",{d:e("memoryUsage"),fill:"none",stroke:"#3b82f6",strokeWidth:"0.7"}),(0,a.jsx)("path",{d:e("threadCountPercentage"),fill:"none",stroke:"#64748b",strokeWidth:"0.7"}),(0,a.jsx)("path",{d:e("throughputPercentage"),fill:"none",stroke:"#ef4444",strokeWidth:"0.7"}),(0,a.jsx)("path",{d:e("queuePercentage"),fill:"none",stroke:"#a855f7",strokeWidth:"0.7"})]})})()}),(0,a.jsxs)("div",{className:"absolute top-2 right-2 bg-white/80 dark:bg-gray-900/80 p-2 rounded text-xs space-y-1",children:[(0,a.jsxs)("div",{className:"flex items-center",children:[(0,a.jsx)("div",{className:"w-3 h-3 bg-green-500 dark:bg-green-400 mr-2"}),(0,a.jsx)("div",{children:"CPU Usage"})]}),(0,a.jsxs)("div",{className:"flex items-center",children:[(0,a.jsx)("div",{className:"w-3 h-3 bg-blue-500 dark:bg-blue-400 mr-2"}),(0,a.jsx)("div",{children:"Memory Usage"})]}),(0,a.jsxs)("div",{className:"flex items-center",children:[(0,a.jsx)("div",{className:"w-3 h-3 bg-gray-500 dark:bg-gray-400 mr-2"}),(0,a.jsx)("div",{children:"Thread Count"})]}),(0,a.jsxs)("div",{className:"flex items-center",children:[(0,a.jsx)("div",{className:"w-3 h-3 bg-red-500 dark:bg-red-400 mr-2"}),(0,a.jsx)("div",{children:"Throughput"})]}),(0,a.jsxs)("div",{className:"flex items-center",children:[(0,a.jsx)("div",{className:"w-3 h-3 bg-purple-500 dark:bg-purple-400 mr-2"}),(0,a.jsx)("div",{children:"Request Queue"})]})]})]})]}),(0,a.jsxs)("div",{className:`p-3 rounded border-2\n          ${e>500?"bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700":e>100?"bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700":"bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700"}\n        `,children:[(0,a.jsx)("h4",{className:"font-medium mb-1 dark:text-gray-100",children:"System Status:"}),e<=50&&(0,a.jsx)("p",{className:"text-sm dark:text-gray-200",children:"System is handling connections efficiently. Resources are well-utilized with minimal overhead."}),e>50&&e<=300&&(0,a.jsx)("p",{className:"text-sm dark:text-gray-200",children:"System load increasing. Thread creation is consuming memory and CPU resources."}),e>300&&e<=800&&(0,a.jsx)("p",{className:"text-sm dark:text-gray-200",children:"Warning: High thread count causing significant context switching overhead. Throughput is plateauing despite increasing resource consumption."}),e>800&&(0,a.jsx)("p",{className:"text-sm dark:text-gray-200",children:"Critical: System is overwhelmed with threads. Context switching overhead is degrading performance. Throughput is decreasing despite increased resource usage. Request queue is growing rapidly."})]})]}),(0,a.jsxs)("div",{className:"text-center text-sm text-gray-600 dark:text-gray-300",children:[(0,a.jsx)("strong",{children:"Figure 1:"})," Interactive visualization of thread-per-connection scaling issues. As connection count increases, resources are consumed by thread overhead, while throughput plateaus and then declines due to context switching costs."]})]})}},7203:e=>{e.exports=JSON.parse('{"permalink":"/byte_vault/tokio-internals-visualised","source":"@site/blog/2025-04-19-tokio-internals.mdx","title":"Understanding Eventloops (Tokio Internals)","description":"Prelude","date":"2025-04-19T00:00:00.000Z","tags":[{"inline":false,"label":"Rust","permalink":"/byte_vault/tags/rust","description":"Rust lang"},{"inline":false,"label":"Tokio","permalink":"/byte_vault/tags/tokio","description":"Tokio async runtime"},{"inline":false,"label":"Async","permalink":"/byte_vault/tags/async","description":"Asynchronous programming"},{"inline":false,"label":"Event Loop","permalink":"/byte_vault/tags/eventloop","description":"Event loop"}],"readingTime":2.805,"hasTruncateMarker":true,"authors":[{"name":"Abhishek Tripathi","title":"Curiosity brings awareness.","url":"https://github.com/TwistingTwists","page":{"permalink":"/byte_vault/authors/abeeshake"},"socials":{"x":"https://x.com/twistin456","github":"https://github.com/TwistingTwists"},"imageURL":"https://github.com/TwistingTwists.png","key":"abeeshake"}],"frontMatter":{"slug":"tokio-internals-visualised","title":"Understanding Eventloops (Tokio Internals)","date":"2025-04-19T00:00:00.000Z","authors":["abeeshake"],"tags":["rust","tokio","async","eventloop"],"draft":false},"unlisted":false,"prevItem":{"title":"Database Isolation (dirty reads)","permalink":"/byte_vault/database-isolation-visualised-dirty-reads"},"nextItem":{"title":"Connection Pooling - in Depth","permalink":"/byte_vault/connection-pooling-in-depth"}}')}}]);