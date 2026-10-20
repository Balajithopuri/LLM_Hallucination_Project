require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Check whether the server is running
app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "HalluciCheck backend is running!"
    });
});

// Find relevant sentences in reference text
function retrieveRelevantText(question, referenceText) {
    const questionWords = new Set(
        question.toLowerCase().match(/\b[a-z0-9]+\b/g) || []
    );

    const sentences = referenceText
        .split(/(?<=[.!?])\s+/)
        .filter(sentence => sentence.trim().length > 0);

    const scoredSentences = sentences.map(sentence => {
        const words =
            sentence.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];

        const score = words.filter(word =>
            questionWords.has(word)
        ).length;

        return { sentence, score };
    });

    return scoredSentences
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.sentence)
        .join(" ");
}

// Generate an answer with or without retrieval
app.post("/api/answer", async (req, res) => {
    try {
        const { question, mode, referenceText = "" } = req.body;

        if (!question || typeof question !== "string") {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }

        if (!["without", "with"].includes(mode)) {
            return res.status(400).json({
                error: "Mode must be 'without' or 'with'."
            });
        }

        let instructions;
        let input = question;
        let retrievedContext = "";

        if (mode === "with") {
            if (!referenceText.trim()) {
                return res.status(400).json({
                    error: "Please provide reference text for retrieval."
                });
            }

            retrievedContext = retrieveRelevantText(
                question,
                referenceText
            );

            if (!retrievedContext) {
                return res.status(422).json({
                    error: "No relevant sentences were found in the reference text."
                });
            }

            instructions =
                "Answer the user's question using only the supplied reference context. " +
                "If the context does not contain the answer, say that the reference " +
                "does not provide enough information. Do not invent facts.";

            input =
                "Reference context:\n" +
                retrievedContext +
                "\n\nQuestion:\n" +
                question;
        } else {
            instructions =
                "Answer the user's question using your existing model knowledge. " +
                "Be clear and factual. If you are unsure, acknowledge uncertainty. " +
                "Do not claim that you searched external sources.";
        }

        const response = await client.responses.create({
            model: "gpt-5.4-mini",
            instructions,
            input,
            max_output_tokens: 400
        });

        res.json({
            answer: response.output_text,
            mode,
            retrievedContext
        });

    } catch (error) {
        console.error("AI request failed:", error.message);

        if (error.status === 401) {
            return res.status(502).json({
                error: "The API key was rejected. Check your .env file."
            });
        }

        if (error.status === 429) {
            return res.status(429).json({
                error: "The API quota or rate limit was reached. Check your API billing and usage."
            });
        }

        res.status(500).json({
            error: "Unable to generate an answer. Check the server terminal."
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(
        `HalluciCheck is running at http://localhost:${PORT}`
    );
});