import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:8087",
})

// // Control TUI interface
// await client.tui.appendPrompt({
//   body: { text: "Hello. Just respond 'Hello Sam'" },
// })

// await client.tui.submitPrompt();

await client.tui.showToast({
  body: { message: "Task completed", variant: "success" },
})

// const sessions=await client.session.list();
// console.log(sessions)

// const lastSessionId=await client.session.get({path: { id: "ses_59ba5cdfdffe4KHDsMinCfMsZt"}});

// const messages=await client.session.messages({path: { id: "ses_59ba5cdfdffe4KHDsMinCfMsZt"}});

// console.log(messages.data);

// messages.data.forEach(msg=>{
//     //console.log(msg.parts);
//     msg.parts.forEach(part=>{
//         if(part.type==="text"){
//             console.log(part.text);
//         }
//     })
// })

// const events = await client.event.subscribe()
// for await (const event of events.stream) {
//   console.log("Event:", event.type, event.properties)
// }