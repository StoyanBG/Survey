const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { initializeDB, saveSurvey, getSurvey } = require('./database/database.js');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve static files

// Initialize the database
initializeDB(); // Use the correct function name here

// Root route - serves the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Endpoint to create a survey
app.post('/surveys', async (req, res) => {
    const { title, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        const surveyId = await saveSurvey(title, questions);
        res.status(201).json({ message: 'Успешно създадена анкета', surveyId });
    } catch (error) {
        console.error('Error saving survey:', error);
        res.status(500).json({ error: 'Failed to save survey' });
    }
});

// Endpoint to get a survey by ID
app.get('/surveys/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const survey = await getSurvey(id);

        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        res.json(survey);
    } catch (error) {
        console.error('Error fetching survey:', error);
        res.status(500).json({ error: 'Failed to fetch survey' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
