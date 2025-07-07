# College Football Dynasty Tracker

A full-stack web application for tracking college football dynasty simulations. Built with Flask (Python) backend and Next.js (React) frontend.

## Features

### Backend (Flask API)
- **Season Management**: Create and manage multiple seasons with progression
- **Team Management**: Track teams, conferences, and conference changes
- **Player Management**: Comprehensive player tracking with stats, progression, and career paths
- **Game Management**: Schedule and simulate games with detailed statistics
- **Recruiting System**: Manage recruiting classes and player commitments
- **Transfer Portal**: Handle player transfers between teams
- **Awards & Honors**: Track player and team achievements
- **Playoff System**: Manage postseason tournaments and bowl games
- **Draft System**: NFL draft simulation for graduating players
- **Rankings**: Dynamic team and player rankings
- **Career Tracking**: Monitor player development and career progression

### Frontend (Next.js)
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Responsive Design**: Mobile-first approach with shadcn/ui components
- **Real-time Updates**: Dynamic data updates and state management
- **Interactive Components**: Drag-and-drop, charts, modals, and forms
- **Theme Support**: Dark/light mode with theme switching
- **Type Safety**: Full TypeScript implementation

## Tech Stack

### Backend
- **Flask**: Python web framework
- **SQLAlchemy**: ORM for database management
- **SQLite**: Database (easily switchable to PostgreSQL)
- **Marshmallow**: Data serialization and validation
- **Flask-CORS**: Cross-origin resource sharing

### Frontend
- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library
- **Radix UI**: Headless UI primitives
- **Recharts**: Data visualization
- **React Hook Form**: Form management
- **Zod**: Schema validation

## Project Structure

```
ea_cfb_dynasty_tracker/
├── app.py                 # Main Flask application
├── models.py              # SQLAlchemy database models
├── schemas.py             # Marshmallow serialization schemas
├── extensions.py          # Flask extensions (db, cors)
├── requirements.txt       # Python dependencies
├── pyproject.toml        # Python project configuration
├── populate_db.py        # Database seeding script
├── instance/
│   └── dynasty.db        # SQLite database
├── routes/               # Flask API blueprints
│   ├── seasons.py        # Season management
│   ├── teams.py          # Team management
│   ├── players.py        # Player management
│   ├── games.py          # Game management
│   ├── recruiting.py     # Recruiting system
│   ├── transfer.py       # Transfer portal
│   ├── awards.py         # Awards and honors
│   ├── playoff.py        # Playoff system
│   ├── draft.py          # NFL draft
│   ├── rankings.py       # Rankings
│   ├── career.py         # Career tracking
│   ├── honors.py         # Player honors
│   ├── conferences.py    # Conference management
│   ├── dashboard.py      # Dashboard data
│   └── season_actions.py # Season progression
├── frontend/             # Next.js frontend application
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Home page
│   │   ├── players/      # Player pages
│   │   ├── games/        # Game pages
│   │   ├── recruiting/   # Recruiting pages
│   │   ├── rankings/     # Rankings pages
│   │   ├── awards/       # Awards pages
│   │   └── settings/     # Settings pages
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── navigation.tsx
│   │   ├── SeasonSelector.tsx
│   │   └── ...           # Other components
│   ├── lib/              # Utility libraries
│   │   ├── api.ts        # API client
│   │   └── utils.ts      # Utility functions
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── types.ts          # TypeScript type definitions
│   ├── package.json      # Node.js dependencies
│   └── tailwind.config.ts # Tailwind configuration
└── college_football_logos/ # Team logo assets
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 18+
- pnpm (recommended) or npm

### Backend Setup

1. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Initialize the database**
   ```bash
   python -c "from app import app, db; app.app_context().push(); db.create_all()"
   ```

4. **Run the Flask server**
   ```bash
   python app.py
   ```
   The API will be available at `http://localhost:5001/api/`. The server now
   listens on all interfaces so you can reach it from other devices on your
   network at `http://<raspberry-pi-ip>:5001`.

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   pnpm install  # or npm install
   ```

3. **Run the development server**
   ```bash
   pnpm dev  # or npm run dev
   ```
   The frontend will be available at `http://localhost:3000`.
   When accessing the site from another device, you need to tell the frontend
   where the API is hosted. Create a `frontend/.env.local` file and set the
   variable `NEXT_PUBLIC_API_URL` to your Flask server URL. For example:

   ```bash
   echo "NEXT_PUBLIC_API_URL=http://<raspberry-pi-ip>:5001/api" > frontend/.env.local
   ```

   This value is read by the `API_BASE_URL` constant in
   [`frontend/lib/api.ts`](frontend/lib/api.ts), which is used for all API
   requests. Adjust the URL if your server runs on a different host or port.


### Database Seeding (Optional)

To populate the database with initial data:
```bash
python populate_db.py
```

## API Endpoints

The Flask backend provides RESTful API endpoints for all major features:

- `GET/POST /api/seasons` - Season management
- `GET/POST /api/teams` - Team management
- `GET/POST /api/players` - Player management
- `GET/POST /api/games` - Game management
- `GET/POST /api/recruiting` - Recruiting system
- `GET/POST /api/transfer` - Transfer portal
- `GET/POST /api/awards` - Awards and honors
- `GET/POST /api/playoff` - Playoff system
- `GET/POST /api/draft` - NFL draft
- `GET/POST /api/rankings` - Rankings
- `GET/POST /api/career` - Career tracking

## Development

### Backend Development
- The Flask app runs on port 5001
- Debug mode is enabled by default
- Database is automatically created on startup
- CORS is configured for frontend integration

### Frontend Development
- Next.js development server runs on port 3000
- Hot reloading enabled
- TypeScript strict mode
- ESLint configuration included

### Database
- SQLite database stored in `instance/dynasty.db`
- Can be easily migrated to PostgreSQL for production
- Models support relationships and constraints

## Deployment

### Backend Deployment
- Can be deployed to any Python hosting platform
- Consider using PostgreSQL for production databases
- Add authentication for production use

### Frontend Deployment
- Build with `pnpm build`
- Deploy to Vercel, Netlify, or any static hosting
- Configure environment variables for API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and personal use.

## Notes

- The application is designed for local use (e.g., on a Raspberry Pi)
- No authentication is implemented (all endpoints are open)
- Data entry is manual via the frontend interface
- Additional actions like player progression are handled in separate blueprints
- The frontend uses modern React patterns with hooks and context
- All components are built with accessibility in mind
