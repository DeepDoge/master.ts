import chalk from 'chalk'
import express from 'express'
import fs from "fs"
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'dev'
const ssrOutletString = '<!--ssr-outlet-->'
const root = path.resolve(__dirname, 'dist')

async function createServer()
{
    const app = express()

    if (isDev)
    {
        // Create Vite server in middleware mode and configure the app type as
        // 'custom', disabling Vite's own HTML serving logic so parent server
        // can take control
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
            mode: 'development'
        })

        // use vite's connect instance as middleware
        // if you use your own express router (express.Router()), you should use router.use
        app.use(vite.middlewares)

        // Serve vite's client-side JS entrypoint
        app.use("*", async (req, res, next) =>
        {
            const url = req.originalUrl

            try
            {
                // 1. Read index.html
                let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')

                // 2. Apply Vite HTML transforms. This injects the Vite HMR client, and
                //    also applies HTML transforms from Vite plugins, e.g. global preambles
                //    from @vitejs/plugin-react
                template = await vite.transformIndexHtml(url, template)

                // 3. Load the server entry. vite.ssrLoadModule automatically transforms
                //    your ESM source code to be usable in Node.js! There is no bundling
                //    required, and provides efficient invalidation similar to HMR.
                const { render } = await vite.ssrLoadModule('/src/entry-server.ts')

                // 4. render the app HTML. This assumes entry-server.js's exported `render`
                //    function calls appropriate framework SSR APIs,
                //    e.g. ReactDOMServer.renderToString()
                const appHtml = await render(url)

                // 5. Inject the app-rendered HTML into the template.
                const html = template.replace(ssrOutletString, appHtml)

                // 6. Send the rendered HTML back.
                res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
            }
            catch (e)
            {
                // If an error is caught, let Vite fix the stack trace so it maps back to
                // your actual source code.
                vite.ssrFixStacktrace(e)
                next(e)
            }
        })
    }
    else
    {
        // Serve static files from the dist directory
        app.use(express.static(path.resolve(root, 'client'), { index: false }))

        // Serve the index.html file for all other requests
        app.use("*", async (req, res, next) =>
        {
            const url = req.originalUrl
            try
            {
                // 1. Read index.html
                let template = fs.readFileSync(path.resolve(root, 'client', 'index.html'), 'utf-8')

                // 3. Load the server entry. vite.ssrLoadModule automatically transforms
                //    your ESM source code to be usable in Node.js! There is no bundling
                //    required, and provides efficient invalidation similar to HMR.
                const { render } = await import(path.resolve(root, 'server', 'entry-server.js'))

                // 4. render the app HTML. This assumes entry-server.js's exported `render`
                //    function calls appropriate framework SSR APIs,
                //    e.g. ReactDOMServer.renderToString()
                const appHtml = await render(url)

                // 5. Inject the app-rendered HTML into the template.
                const html = template.replace(ssrOutletString, appHtml)

                // 6. Send the rendered HTML back.
                res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
            }
            catch (e)
            {
                next(e)
            }
        })
    }

    const port = process.env.PORT ?? '3000'
    app.listen(port)

    console.log(`Listening port ${chalk.green(port)} in ${isDev ? chalk.bgRedBright('development') : chalk.bgBlueBright('production')}`)
    console.log(chalk.bold('>'), chalk.underline(chalk.blue(`http://localhost:${port}`)))
}

createServer()