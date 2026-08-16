import app from "./app.js";
import connectDB from "./infra/db.js";
import env from "./shared/config/env.js";

async function bootstrap() {

    await connectDB()

    app.listen(env.port, () => {
        console.log("SERVER START")
    })

}

bootstrap().catch(e => {
    console.log("SERVER ERROR: ", e)
})