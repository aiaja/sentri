require("dotenv").config();
const OpenAI = require('openai');
const express = require('express');
const { OPEN_AI_KEY, ASSISTANT_ID } = process.env;

//SETUP EXPRESS
const app = express();
app.use(express.json());

//SETUP OPENAI CLIENT
const openai = new OpenAI({
    apiKey: OPEN_AI_KEY,
});

//ASSISTANT CAN BE CREATED VIA API OR UI
const assistantId = ASSISTANT_ID;
let pollingInterval;

//SETUP A THREAD
async function createThread() {
    console.log('Creating a new thread...');
    const thread = await openai.beta.threads.create();
    return thread;
}

async function addMessage(threadId, message) {
    console.log('Adding a new message to thread: ' + threadId);
    const response = await openai.beta.threads.messages.create(
        threadId,
        {
            role: "user",
            content: message
        }
    );
    return response;    
}

async function runAssistant(threadId) {
    console.log('Running assistant for thread: ' + threadId)
    const response = await openai.beta.threads.runs.create(
        threadId,
        { 
          assistant_id: assistantId
          // Make sure to not overwrite the original instruction, unless you want to
        }
      );

    console.log(response)

    return response;
}

async function checkingStatus(res, threadId, runId) {
    const runObject = await openai.beta.threads.runs.retrieve(
        threadId,
        runId
    );
    
    const status = runObject.status;
    console.log(runObject)
    console.log('Current status: ' + status);

    if(status == 'completed') {
        clearInterval(pollingInterval);

 

        res.json({ messages });
    }
}

//ROUTE SERVER

//OPEN A NEW THREAD
app.get('/thread', (req,res) => {
    createThread().then(thread => {
        res.json({threadId: thread.id});
    });
})

//SEND A NEW MESSAGE
app.post('/message', (req, res) => {
    const { message, threadId } = req.body;
    if(message == null || threadId == null){
        res.json({
            data: "error kosong"
        })
    }
    addMessage(threadId, message).then(message => {
        //res.json({messageId: message.id});

        //RUN THE ASSISTANT
        runAssistant(threadId).then(run => {
            const runId = run.id;

            //CHECKING THE STATUS
            pollingInterval = setInterval(() => {
                checkingStatus(res, threadId, runId);
            }, 5000);
        });
    });
});

//START THE SERVER
const PORT = process.env.PORT || 5501;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})