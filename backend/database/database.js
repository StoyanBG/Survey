const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./survey.db');

function initializeDB() {
    db.serialize(() => {
        // Create Surveys table
        db.run(`
            CREATE TABLE IF NOT EXISTS surveys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL
            )
        `);

        // Create Questions table
        db.run(`
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                survey_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                question_type TEXT NOT NULL,
                FOREIGN KEY(survey_id) REFERENCES surveys(id)
            )
        `);

        // Create Options table
        db.run(`
            CREATE TABLE IF NOT EXISTS options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id INTEGER NOT NULL,
                option_text TEXT NOT NULL,
                FOREIGN KEY(question_id) REFERENCES questions(id)
            )
        `);
    });
}

function saveSurvey(title, questions) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO surveys (title) VALUES (?)', [title], function (err) {
            if (err) return reject(err);

            const surveyId = this.lastID;
            const questionPromises = questions.map((q) => saveQuestion(surveyId, q));

            Promise.all(questionPromises)
                .then(() => resolve(surveyId))
                .catch(reject);
        });
    });
}

function saveQuestion(surveyId, question) {
    return new Promise((resolve, reject) => {
        const { text, type, options } = question;

        db.run(
            'INSERT INTO questions (survey_id, question_text, question_type) VALUES (?, ?, ?)',
            [surveyId, text, type],
            function (err) {
                if (err) return reject(err);

                const questionId = this.lastID;

                if (options && Array.isArray(options)) {
                    const optionPromises = options.map((opt) =>
                        saveOption(questionId, opt)
                    );

                    Promise.all(optionPromises)
                        .then(resolve)
                        .catch(reject);
                } else {
                    resolve();
                }
            }
        );
    });
}

function saveOption(questionId, optionText) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO options (question_id, option_text) VALUES (?, ?)',
            [questionId, optionText],
            function (err) {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

function getSurvey(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM surveys WHERE id = ?', [id], (err, survey) => {
            if (err) return reject(err);
            if (!survey) return resolve(null);

            db.all(
                'SELECT * FROM questions WHERE survey_id = ?',
                [id],
                (err, questions) => {
                    if (err) return reject(err);

                    const questionPromises = questions.map((q) =>
                        getQuestionWithOptions(q)
                    );

                    Promise.all(questionPromises)
                        .then((detailedQuestions) => {
                            survey.questions = detailedQuestions;
                            resolve(survey);
                        })
                        .catch(reject);
                }
            );
        });
    });
}

function getQuestionWithOptions(question) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM options WHERE question_id = ?',
            [question.id],
            (err, options) => {
                if (err) return reject(err);

                question.options = options.map((o) => o.option_text);
                resolve(question);
            }
        );
    });
}

module.exports = {
    initializeDB,
    saveSurvey,
    getSurvey,
};
