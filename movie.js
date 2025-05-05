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
  apis: ['./movie.js'], // Point to this file
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/moviesDB');
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const app = express();
const PORT = 3000;
connectDB();

// Middleware
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  fs.appendFile('log.txt', log, (err) => {
    if (err) console.error('Logging error:', err);
  });
  next();
});

// Swagger docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the Movies Management API!');
});

// Mongoose schema
const movieSchema = new mongoose.Schema({
  title: String,
  director: String,
  releaseYear: Number,
  genre: String,
  image: String,
});

const Movie = mongoose.model('Movie', movieSchema);

/**
 * @swagger
 * /api/movies:
 *   get:
 *     description: Get all movies (with optional filters)
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
 *         description: A list of movies
 */
app.get('/api/movies', async (req, res, next) => {
  try {
    const { title, releaseYear, genre } = req.query;
    const filter = {};
    if (title) filter.title = new RegExp(title, 'i');
    if (releaseYear) filter.releaseYear = parseInt(releaseYear);
    if (genre) filter.genre = genre;

    const movies = await Movie.find(filter);
    res.json(movies);
  } catch (err) {
    next(err);
  }
});

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
 *         description: Movie added
 */
app.post('/api/movies',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('director').notEmpty().withMessage('Director is required'),
    body('releaseYear')
      .isInt({ min: 1888, max: new Date().getFullYear() })
      .withMessage('Release year must be valid'),
    body('genre')
      .isIn(['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Other'])
      .withMessage('Invalid genre'),
    body('image').optional().isURL().withMessage('Image must be a valid URL'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const movie = new Movie(req.body);
      await movie.save();
      res.status(201).json(movie);
    } catch (err) {
      next(err);
    }
  }
);

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
 *         description: Movie updated
 *       404:
 *         description: Movie not found
 */
app.put('/api/movies/:id',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('director').notEmpty().withMessage('Director is required'),
    body('releaseYear')
      .isInt({ min: 1888, max: new Date().getFullYear() })
      .withMessage('Release year must be valid'),
    body('genre')
      .isIn(['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Other'])
      .withMessage('Invalid genre'),
    body('image').optional().isURL().withMessage('Image must be a valid URL'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!movie) return res.status(404).json({ error: 'Movie not found' });
      res.json(movie);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Delete a movie
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Movie deleted
 *       404:
 *         description: Movie not found
 */
app.delete('/api/movies/:id', async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    next(err);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  fs.appendFile('log.txt', `[${new Date().toISOString()}] ERROR: ${err.stack}\n`, () => {});
  res.status(500).json({
    error: 'Server Error',
    message: err.message || 'Something went wrong',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
