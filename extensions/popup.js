document.getElementById("askBtn").addEventListener("click", async () => {
    const question = document.getElementById("question").value;
    const answerBox = document.getElementById("answer");

    if (!question) {
        answerBox.innerText = "Please enter a question.";
        return;
    }

    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: tabs[0].url,
            question: question
        })
    });

    const data = await response.json();
    answerBox.innerText = data.answer;
});