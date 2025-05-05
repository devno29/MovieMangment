const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Movies Management API',
      version: '1.0.0',
      description: 'A simple API to manage movies',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./movie.js'], 
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);


// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/moviesDB');
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit if DB connection fails
  }
};

const app = express();
const PORT = 3000;

connectDB();

// Middleware
app.use(express.json());

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Logger middleware
app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  fs.appendFile('log.txt', log, (err) => {
    if (err) console.error('Logging error:', err);
  });
  next();
});


// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the Movies Management API!');
});

// Mongoose schema and model
const movieSchema = new mongoose.Schema({
  title: String,
  director: String,
  releaseYear: Number,
  genre: String,
  image: String
});

const Movie = mongoose.model('Movie', movieSchema);



// GET all movies

/**
 * @swagger
 * /api/movies:
 *   get:
 *     description: Get all movies (optionally filtered by title, year, genre)
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *       - in: query
 *         name: releaseYear
 *         schema:
 *           type: integer
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of movies
 */
app.get('/api/movies', async (req, res) => {
  try {
    const { title, releaseYear, genre } = req.query;
    const filter = {};
    if (title) filter.title = new RegExp(title, 'i');
    if (releaseYear) filter.releaseYear = parseInt(releaseYear);
    if (genre) filter.genre = genre;

    const movies = await Movie.find(filter);
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});


// POST a new movie

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Add a new movie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - director
 *               - releaseYear
 *               - genre
 *             properties:
 *               title:
 *                 type: string
 *               director:
 *                 type: string
 *               releaseYear:
 *                 type: integer
 *               genre:
 *                 type: string
 *                 enum: [Action, Comedy, Drama, Horror, Sci-Fi, Romance, Other]
 *               image:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Movie added successfully
 */
app.post('/api/movies',
  [
    body('title')
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 1 }).withMessage('Title must be at least 1 character'),
    
    body('director')
      .notEmpty().withMessage('Director is required'),
    
    body('releaseYear')
      .notEmpty().withMessage('Release year is required')
      .isInt({ min: 1888, max: new Date().getFullYear() })
      .withMessage('Release year must be valid'),
    
    body('genre')
      .notEmpty().withMessage('Genre is required')
      .isIn(['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Other'])
      .withMessage('Invalid genre'),

    body('image')
      .optional()
      .isURL().withMessage('Image must be a valid URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // If valid, continue to save to DB
    const movie = new Movie(req.body);
    await movie.save();
    res.status(201).json(movie);
  }
);


// PUT (Update) a movie

/**
 * @swagger
 * /api/movies/{id}:
 *   put:
 *     summary: Update an existing movie
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - director
 *               - releaseYear
 *               - genre
 *             properties:
 *               title:
 *                 type: string
 *               director:
 *                 type: string
 *               releaseYear:
 *                 type: integer
 *               genre:
 *                 type: string
 *                 enum: [Action, Comedy, Drama, Horror, Sci-Fi, Romance, Other]
 *               image:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Movie updated successfully
 *       404:
 *         description: Movie not found
 */

app.put('/api/movies/:id',
  [
    body('title')
      .notEmpty().withMessage('Title is required')
      .isLength({ min: 1 }).withMessage('Title must be at least 1 character'),
    
    body('director')
      .notEmpty().withMessage('Director is required'),

    body('releaseYear')
      .notEmpty().withMessage('Release year is required')
      .isInt({ min: 1888, max: new Date().getFullYear() })
      .withMessage('Release year must be valid'),

    body('genre')
      .notEmpty().withMessage('Genre is required')
      .isIn(['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Other'])
      .withMessage('Invalid genre'),
      
    body('image')
      .optional()
      .isURL().withMessage('Image must be a valid URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!movie) return res.status(404).json({ error: 'Movie not found' });
      res.json(movie);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);



// Delete a movie

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     description: Delete a movie
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the movie to delete
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Movie deleted
 *       404:
 *         description: Movie not found
 */
app.delete('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).send('Movie not found');
    res.send('Movie deleted');
  } catch (err) {
    res.status(400).send('Invalid ID');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
