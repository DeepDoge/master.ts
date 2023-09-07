import { onConnected$, signal } from "@/../lib/core"

/* 
The code below will do two things:

1. When `myNode` is connected to DOM, it will follow the signal
2. When `myNode` is disconnected from DOM, it will unfollow the signal
*/

const myNode = document.createComment("myNode")
const mySignal = signal(123)

mySignal.follow$(myNode, (value) => {
	console.log(value)
})

/* 
Same as: 
*/
onConnected$(
	myNode,
	mySignal.follow((value) => {
		console.log(value)
	}).unfollow
)
