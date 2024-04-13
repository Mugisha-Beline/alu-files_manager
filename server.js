import express from "express";
import route from "./routes";

const app = express();

const PORT = process.env.PORT || 5000;

app.use(route);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});