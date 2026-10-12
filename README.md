# Oracle Atlas — AI-enabled Oracle ERP learning hub

A static, browser-based learning website with a secure Vercel serverless AI tutor.

## What's included
- Searchable Oracle/ERP glossary
- Eight guided lessons and quizzes
- Roadmap with browser-local progress
- Module library and simplified end-to-end business process journeys
- Troubleshooting playbook
- Consultant templates and test-case generator
- Flashcards and personal notes export
- AI tutor endpoint (`/api/chat`) that explains concepts in EL5 style and follows a cautious troubleshooting approach
- Official Oracle documentation/training/certification links

## Hosting architecture: GitHub + Vercel
**Recommended:** Keep the source code in GitHub and connect the repository to Vercel. Vercel serves the site and the `/api/chat` serverless function from the same project. GitHub Pages alone cannot run this server-side function.

1. Create a new GitHub repository, e.g. `oracle-atlas`.
2. Upload/extract all files in this project into the repository root. Keep `api/chat.js`, `index.html`, and `vercel.json` at the paths shown.
3. Import that GitHub repository in Vercel and deploy it.
4. In Vercel, open **Project → Settings → Environment Variables**.
5. Add `OPENAI_API_KEY` with your secret API key. Optionally set `OPENAI_MODEL` to a model available to your API account. Never commit the key to GitHub or place it in `index.html`.
6. Redeploy after adding the environment variable.
7. Open the Vercel URL. Pushes to the connected GitHub branch can trigger redeployments.

## Local preview
The learning site can be opened directly as `index.html`, but AI chat will not work from a `file://` URL. To test the serverless endpoint locally, install Node.js and the Vercel CLI, then run `vercel dev` from the project folder. Configure the environment variable securely in your local Vercel environment.

## API behavior
- Browser calls same-origin `POST /api/chat`.
- API key is read only from the server environment.
- Input length and history are capped.
- Provider errors are returned as generic messages; details go to server logs.
- Model name defaults to `gpt-4.1-mini`; set `OPENAI_MODEL` if needed and available to your account.
- AI responses can be incorrect. Confirm important Oracle configuration advice against official documentation and the target tenant.

## Cost, privacy, and abuse prevention
- API usage may incur charges on your AI provider account.
- Anyone who can access the public site may be able to use the tutor and create usage costs. Before sharing widely, add authentication or rate limiting, set provider usage limits/alerts, and consider a daily request quota.
- Do not send real employee, customer, supplier, medical, financial, credential, or other confidential data to the tutor.
- This starter uses no login or database. Notes and progress are saved in each user's own browser and do not sync between devices.
- Do not use this starter as a production system for sensitive business data.

## Scope
This is a learning product, not an exhaustive Oracle manual or official Oracle service. Oracle capabilities and setup behavior depend on product, release, licensing, security, and implementation. The troubleshooting playbook gives diagnostic approaches, not guaranteed root causes.
