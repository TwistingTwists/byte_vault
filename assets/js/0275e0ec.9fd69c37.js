"use strict";(self.webpackChunkbytevault=self.webpackChunkbytevault||[]).push([[278],{7805:(e,s,n)=>{n.r(s),n.d(s,{assets:()=>a,contentTitle:()=>l,default:()=>h,frontMatter:()=>o,metadata:()=>t,toc:()=>d});var t=n(6633),r=n(4848),i=n(8453);const o={slug:"how-to-solve-reverse-proxy-performance-issues-in-caddy-server-a-300-performance-boost-using-unix-sockets",title:"Caddy Reverse Proxy Performance: 300% Boost with Unix Sockets",date:new Date("2024-12-23T00:00:00.000Z"),authors:["abeeshake"],tags:["performance","caddy"]},l=void 0,a={authorsImageUrls:[void 0]},d=[{value:"The Problem",id:"the-problem",level:2},{value:"Multi-Threading Performance Impact",id:"multi-threading-performance-impact",level:3},{value:"The Investigation",id:"the-investigation",level:2},{value:"Table 1: System Metrics",id:"table-1-system-metrics",level:3},{value:"Table 2: Profile Analysis",id:"table-2-profile-analysis",level:3},{value:"Table 3: Network Testing",id:"table-3-network-testing",level:3},{value:"Table 4: Kernel Analysis",id:"table-4-kernel-analysis",level:3},{value:"The Solution",id:"the-solution",level:2},{value:"Key Takeaways",id:"key-takeaways",level:2}];function c(e){const s={a:"a",code:"code",h2:"h2",h3:"h3",hr:"hr",li:"li",ol:"ol",p:"p",pre:"pre",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)(s.p,{children:["A recent GitHub issue  ",(0,r.jsx)(s.a,{href:"https://github.com/caddyserver/caddy/issues/6751",children:"#6751"}),"  in the Caddy server repository revealed an interesting performance bottleneck when using multiple layers of reverse proxying. Here's what was discovered and how it was resolved."]}),"\n","\n",(0,r.jsx)(s.h2,{id:"the-problem",children:"The Problem"}),"\n",(0,r.jsx)(s.p,{children:"A user reported significant performance degradation when implementing multiple layers of reverse proxies in Caddy v2.8.4. The setup consisted of a chain of reverse proxies:"}),"\n",(0,r.jsxs)(s.ul,{children:["\n",(0,r.jsx)(s.li,{children:"Port 8081: Serving static files"}),"\n",(0,r.jsx)(s.li,{children:"Port 8082: Proxying to 8081"}),"\n",(0,r.jsx)(s.li,{children:"Port 8083: Proxying to 8082"}),"\n",(0,r.jsx)(s.li,{children:"Port 8084: Proxying to 8083"}),"\n"]}),"\n",(0,r.jsx)(s.p,{children:"When testing with a 1000MB file download, the performance metrics showed a clear pattern of degradation:"}),"\n",(0,r.jsx)(s.h3,{id:"multi-threading-performance-impact",children:"Multi-Threading Performance Impact"}),"\n",(0,r.jsxs)(s.ul,{children:["\n",(0,r.jsx)(s.li,{children:"Direct file server (8081): ~300 Mbps with 5 threads"}),"\n",(0,r.jsx)(s.li,{children:"First proxy layer (8082): ~60 Mbps with 5 threads"}),"\n",(0,r.jsx)(s.li,{children:"Second proxy layer (8083): ~16 Mbps with 5 threads"}),"\n",(0,r.jsx)(s.li,{children:"Third proxy layer (8084): ~16 Mbps with 5 threads"}),"\n"]}),"\n",(0,r.jsx)(s.p,{children:"What made this particularly interesting was that the server's CPU usage remained surprisingly low (1-5%), suggesting that the bottleneck wasn't in processing power."}),"\n",(0,r.jsx)(s.h2,{id:"the-investigation",children:"The Investigation"}),"\n",(0,r.jsx)(s.p,{children:"The investigation, led by Caddy maintainers including Matt Holt, involved:"}),"\n",(0,r.jsxs)(s.ol,{children:["\n",(0,r.jsx)(s.li,{children:"Gathering system metrics"}),"\n",(0,r.jsx)(s.li,{children:"Analyzing CPU and memory profiles"}),"\n",(0,r.jsx)(s.li,{children:"Testing different network configurations"}),"\n",(0,r.jsx)(s.li,{children:"Examining kernel settings"}),"\n"]}),"\n",(0,r.jsx)(s.h3,{id:"table-1-system-metrics",children:"Table 1: System Metrics"}),"\n",(0,r.jsxs)(s.table,{children:[(0,r.jsx)(s.thead,{children:(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Commands"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Why It Is Relevant to Debugging"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Output and Conclusion"})})]})}),(0,r.jsxs)(s.tbody,{children:[(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"ulimit -a"})}),(0,r.jsx)(s.td,{children:"Checks system limits such as maximum number of open files and other resource constraints that could impact performance."}),(0,r.jsx)(s.td,{children:"No bottlenecks identified in file descriptors or resource limits."})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"sysctl -p"})}),(0,r.jsx)(s.td,{children:"Confirms network-related kernel parameters such as buffer sizes, default queuing discipline, and TCP congestion control settings."}),(0,r.jsxs)(s.td,{children:[(0,r.jsx)("br",{}),(0,r.jsx)(s.code,{children:"net.core.rmem_max = 2097152"}),(0,r.jsx)("br",{}),(0,r.jsx)(s.code,{children:"net.core.wmem_max = 2097152"}),(0,r.jsx)("br",{}),(0,r.jsx)(s.code,{children:"net.core.default_qdisc = fq"}),(0,r.jsx)("br",{}),(0,r.jsx)(s.code,{children:"net.ipv4.tcp_congestion_control = bbr"}),(0,r.jsx)("br",{}),(0,r.jsx)("br",{})," Settings were optimized for high-speed networking.",(0,r.jsx)("br",{}),"TCP congestion control was correctly set to",(0,r.jsx)(s.code,{children:"bbr"}),"."]})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:"General hardware specs (CPU, RAM, NIC, etc.)"}),(0,r.jsx)(s.td,{children:"baseline hardware information"}),(0,r.jsx)(s.td,{children:"Verified adequate resources (1 Core Ryzen 5950X, 1024MB RAM, 10Gbps NIC). No resource-related constraints."})]})]})]}),"\n",(0,r.jsx)(s.hr,{}),"\n",(0,r.jsx)(s.h3,{id:"table-2-profile-analysis",children:"Table 2: Profile Analysis"}),"\n",(0,r.jsxs)(s.table,{children:[(0,r.jsx)(s.thead,{children:(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Commands"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Why It Is Relevant to Debugging"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Output and Conclusion"})})]})}),(0,r.jsxs)(s.tbody,{children:[(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:"Attempted to collect goroutine profiles"}),(0,r.jsx)(s.td,{children:"Helps identify bottlenecks or inefficiencies in goroutines that may be causing performance issues."}),(0,r.jsx)(s.td,{children:"Could not identify significant bottlenecks in goroutines."})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:"Accessed CPU Profile via browser"}),(0,r.jsx)(s.td,{children:"Provides CPU usage details to determine if high CPU usage is a factor affecting performance."}),(0,r.jsx)(s.td,{children:"No high CPU usage detected. CPU load was between 1-5%."})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"wget http://127.0.0.1:2019/debug/pprof/profile?seconds=1000"})}),(0,r.jsx)(s.td,{children:"Downloads detailed CPU profiles for offline analysis."}),(0,r.jsx)(s.td,{children:"Profiles downloaded successfully. Further analysis confirmed no CPU bottlenecks or inefficiencies."})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:"Collected heap profiles"}),(0,r.jsx)(s.td,{children:"Helps analyze memory usage and potential leaks in the application."}),(0,r.jsx)(s.td,{children:"Memory usage was within acceptable limits, with no indication of memory leaks."})]})]})]}),"\n",(0,r.jsx)(s.hr,{}),"\n",(0,r.jsx)(s.h3,{id:"table-3-network-testing",children:"Table 3: Network Testing"}),"\n",(0,r.jsxs)(s.table,{children:[(0,r.jsx)(s.thead,{children:(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Commands"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Why It Is Relevant to Debugging"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Output and Conclusion"})})]})}),(0,r.jsxs)(s.tbody,{children:[(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:"Tests from multiple locations (Singapore, Los Angeles, Seoul)"}),(0,r.jsx)(s.td,{children:"Evaluates network performance across different regions to identify geographical bottlenecks."}),(0,r.jsx)(s.td,{children:"Performance was consistent across all regions."})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:"Tests with different file sizes (100MiB, 1000MiB)"}),(0,r.jsx)(s.td,{children:"Determines if performance issues are related to file size or payload."}),(0,r.jsx)(s.td,{children:"No significant performance variance with different file sizes."})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"curl -o /dev/null http://host.domain:port/1000MiB"})}),(0,r.jsx)(s.td,{children:"Single-threaded test evaluates download performance under minimal concurrency."}),(0,r.jsx)(s.td,{children:"acceptable network speed"})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"echo 1 1 1 1 1 | xargs -n1 -P5 curl -s -o /dev/null http://host.domain:port/1000MiB"})}),(0,r.jsx)(s.td,{}),(0,r.jsx)(s.td,{children:"Multi-threaded test assesses network performance under concurrent load."})]})]})]}),"\n",(0,r.jsx)(s.hr,{}),"\n",(0,r.jsx)(s.h3,{id:"table-4-kernel-analysis",children:"Table 4: Kernel Analysis"}),"\n",(0,r.jsxs)(s.table,{children:[(0,r.jsx)(s.thead,{children:(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Commands"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Why It Is Relevant to Debugging"})}),(0,r.jsx)(s.th,{children:(0,r.jsx)(s.strong,{children:"Output and Conclusion"})})]})}),(0,r.jsx)(s.tbody,{children:(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:"Checked systemd service file settings"}),(0,r.jsx)(s.td,{children:"Confirms that the maximum number of open files is sufficient for high-concurrency workloads."}),(0,r.jsxs)(s.td,{children:["Verified",(0,r.jsx)(s.code,{children:"LimitNOFILE=1048576"}),". No issues found."]})]})})]}),"\n",(0,r.jsx)(s.h2,{id:"the-solution",children:"The Solution"}),"\n",(0,r.jsx)(s.p,{children:"The breakthrough came when testing with Unix sockets instead of TCP connections. By modifying the Caddyfile to use Unix sockets for inter-process communication, the performance issues were completely resolved. Here's what the optimized configuration looked like:"}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{children:":8081 {\n    bind 0.0.0.0 unix//dev/shm/8081.sock\n    file_server browse\n    root * /opt/www\n}\n\n:8082 {\n    bind 0.0.0.0 unix//dev/shm/8082.sock\n    reverse_proxy unix//dev/shm/8081.sock\n}\n\n:8083 {\n    bind 0.0.0.0 unix//dev/shm/8083.sock\n    reverse_proxy unix//dev/shm/8082.sock\n}\n\n:8084 {\n    reverse_proxy unix//dev/shm/8083.sock\n}\n"})}),"\n",(0,r.jsx)(s.h2,{id:"key-takeaways",children:"Key Takeaways"}),"\n",(0,r.jsxs)(s.ol,{children:["\n",(0,r.jsx)(s.li,{children:"TCP connection overhead can significantly impact performance in multi-layer reverse proxy setups"}),"\n",(0,r.jsx)(s.li,{children:"Unix sockets provide a more efficient alternative for local inter-process communication"}),"\n",(0,r.jsx)(s.li,{children:"Low CPU usage doesn't always mean optimal performance - network stack overhead can be the bottleneck"}),"\n",(0,r.jsx)(s.li,{children:"When dealing with multiple local reverse proxies, consider using Unix sockets instead of TCP connections"}),"\n"]})]})}function h(e={}){const{wrapper:s}={...(0,i.R)(),...e.components};return s?(0,r.jsx)(s,{...e,children:(0,r.jsx)(c,{...e})}):c(e)}},8453:(e,s,n)=>{n.d(s,{R:()=>o,x:()=>l});var t=n(6540);const r={},i=t.createContext(r);function o(e){const s=t.useContext(i);return t.useMemo((function(){return"function"==typeof e?e(s):{...s,...e}}),[s,e])}function l(e){let s;return s=e.disableParentContext?"function"==typeof e.components?e.components(r):e.components||r:o(e.components),t.createElement(i.Provider,{value:s},e.children)}},6633:e=>{e.exports=JSON.parse('{"permalink":"/byte_vault/blog/how-to-solve-reverse-proxy-performance-issues-in-caddy-server-a-300-performance-boost-using-unix-sockets","editUrl":"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/blog/2024-12-23-caddy-performance.mdx","source":"@site/blog/2024-12-23-caddy-performance.mdx","title":"Caddy Reverse Proxy Performance: 300% Boost with Unix Sockets","description":"A recent GitHub issue  #6751  in the Caddy server repository revealed an interesting performance bottleneck when using multiple layers of reverse proxying. Here\'s what was discovered and how it was resolved.","date":"2024-12-23T00:00:00.000Z","tags":[{"inline":false,"label":"Performance","permalink":"/byte_vault/blog/tags/performance","description":"Blog posts related to improving and understanding performance."},{"inline":false,"label":"Caddy","permalink":"/byte_vault/blog/tags/caddy","description":"caddy config and tuning"}],"readingTime":3.965,"hasTruncateMarker":true,"authors":[{"name":"Abhishek Tripathi","title":"Curiosity brings awareness.","url":"https://github.com/TwistingTwists","page":{"permalink":"/byte_vault/blog/authors/abeeshake"},"socials":{"x":"https://x.com/twistin456","github":"https://github.com/TwistingTwists"},"imageURL":"https://github.com/TwistingTwists.png","key":"abeeshake"}],"frontMatter":{"slug":"how-to-solve-reverse-proxy-performance-issues-in-caddy-server-a-300-performance-boost-using-unix-sockets","title":"Caddy Reverse Proxy Performance: 300% Boost with Unix Sockets","date":"2024-12-23T00:00:00.000Z","authors":["abeeshake"],"tags":["performance","caddy"]},"unlisted":false,"prevItem":{"title":"Deep Flattening in Rust - Using Recursive Types ","permalink":"/byte_vault/blog/deep-flattening-in-rust-using-recursive-types"},"nextItem":{"title":"1brc - same tricks across languages","permalink":"/byte_vault/blog/1brc-same-tricks-across-languages"}}')}}]);