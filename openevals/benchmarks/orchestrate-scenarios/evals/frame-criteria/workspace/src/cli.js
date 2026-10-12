import { readFileSync, writeFileSync } from "node:fs";

const file = "data/todos.json";

const load = () => JSON.parse(readFileSync(file, "utf8"));

const save = (todos) => writeFileSync(file, `${JSON.stringify(todos, null, 2)}\n`);

const [command, ...args] = process.argv.slice(2);

const todos = load();

if (command === "list") {
  for (const todo of todos) console.log(`${todo.done ? "[x]" : "[ ]"} ${todo.id}  ${todo.title}`);
} else if (command === "add") {
  const title = args.join(" ").trim();

  if (title === "") {
    console.error("usage: todo add <title>");
    process.exit(1);
  }

  const id = Math.max(0, ...todos.map((todo) => todo.id)) + 1;
  todos.push({ id, title, done: false, created: new Date().toISOString() });
  save(todos);
  console.log(`added ${id}`);
} else if (command === "done") {
  const todo = todos.find((item) => item.id === Number(args[0]));

  if (todo === undefined) {
    console.error(`no todo ${args[0]}`);
    process.exit(1);
  }

  todo.done = true;
  save(todos);
} else {
  console.error("usage: todo <list|add|done>");
  process.exit(1);
}
