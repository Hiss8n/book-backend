import cron from "cron";
import https from "https";

const jobs = new cron.CronJob("*/14 * * * * ", function () {
  https
    .get(process.env.API_URL, (res) => {
      if (res.statusCode === 200)
        console.log("GET running on every 14 minutes");
      else console.error("get request failed", res.statusCode);
    })
    .on("error", (e) => console.log(`res response failed ${e}`));
});

export default jobs;
