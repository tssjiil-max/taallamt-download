export const config = {
  framework: "nextjs",
  crons: [
    {
      path: "/api/automation/sync",
      schedule: "5 21 * * *",
    },
  ],
};
