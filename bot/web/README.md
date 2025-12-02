# 530 Web Frontend

A Next.js web application for viewing, searching, and managing your tagged X.com posts. This frontend connects to your Supabase database and provides a beautiful interface for exploring your curated content.

## Features

✅ **Grid View** - Beautiful card layout for all tagged posts
✅ **Real-time Stats** - See total tags and today's activity
✅ **Search** - Find posts by content or author
✅ **Category Filters** - Filter by Content Type, Topic, Quality, or Action
✅ **Tag Filters** - Drill down into specific tags within categories
✅ **Responsive Design** - Works on desktop, tablet, and mobile
✅ **Direct Links** - Click through to view original posts on X.com

## Setup

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Configure Supabase

Edit `web/.env.local` and add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these:**
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon/public key

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
web/
├── app/
│   ├── page.tsx           # Main homepage with posts grid
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/
│   └── supabase.ts        # Supabase client & types
├── .env.local             # Environment variables (create this)
├── package.json
└── README.md
```

## Usage

### Viewing Tagged Posts

The homepage displays all your tagged posts in a grid. Each card shows:
- Author name
- Post content (truncated)
- Tags with color coding
- Date posted
- Link to original post

### Searching

Use the search bar at the top to find posts by:
- Tweet content
- Author name

Results update in real-time as you type.

### Filtering by Category

Click any category button to filter posts:
- **📝 Content Type** - Article, Thread, Meme, etc.
- **🏷️ Topic** - Tech, AI/ML, Design, etc.
- **⭐ Quality** - Must Read, Important, etc.
- **🎯 Action** - Read Later, Research, etc.

### Filtering by Tag

After selecting a category, you can drill down further by selecting specific tags within that category.

### Combining Filters

You can combine search, category filters, and tag filters together for precise results.

## Development

### Adding New Features

The main page component is in `app/page.tsx`. It's a client component that:
- Fetches posts from Supabase on mount
- Filters posts based on user selections
- Displays results in a responsive grid

### Modifying Tag Categories

Edit `lib/supabase.ts` to update the `TAG_CATEGORIES` object. Make sure it matches the categories in your Chrome extension.

### Styling

This project uses Tailwind CSS. Modify styles directly in the JSX using Tailwind classes.

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

### Other Platforms

You can also deploy to:
- Netlify
- AWS Amplify
- Any platform that supports Next.js

## Troubleshooting

### No posts showing

1. Check that your Supabase credentials in `.env.local` are correct
2. Verify you have tagged posts in your database
3. Check browser console for errors
4. Ensure Supabase Row Level Security (RLS) allows public read access

### Build errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

## Next Steps

- [ ] Add user authentication
- [ ] Add ability to edit/delete tags
- [ ] Add export functionality (CSV, JSON)
- [ ] Add analytics dashboard
- [ ] Add collaborative features (shared tags)

---

**Part of the 530 Project** - Social Media Curator
Built with Next.js, TypeScript, Tailwind CSS, and Supabase
