#!/usr/bin/env node

"use strict";

const fs = require("fs");
const readline = require("readline");

const isDebugMode = (process.argv.indexOf("-d") > -1);

let isStringMode = false;
let dir = "right";
let x = -1;
let y = 0;
let stack = [];
let input;

function get(x, y) {
  return input[y] && input[y][x];
}

function put(x, y, v) {
  if (!(y in input)) {
    input[y] = [];
  }
  input[y][x] = v;
}

function move() {
  switch (dir) {
    case "right":
      if (++x == input[y].length) {
        x = 0;
      }
      break;
    case "left":
      if (--x < 0) {
        x = input[y].length - 1;
      }
      break;
    case "up":
      if (--y < 0) {
        y = input.length - 1;
      }
      break;
    case "down":
      if (++y == input.length) {
        y = 0;
      }
      break;
  }
  return get(x, y);
}

function prompt() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.on("line", (line) => {
      rl.close();
      resolve(line);
    });
  });
}

function toASCII(char) {
  if (typeof char == "undefined")
    return "\0";
  
  if (typeof char == "number")
    return String.fromCharCode(char);
  
  return char;
}

function toNumber(char) {
  if (typeof char == "undefined")
    return 0;
  
  if (typeof char == "string")
    return char.charCodeAt(0);
  
  return char;
}

function next() {
  let char = move();
  if (isDebugMode && /[^\s^<>v]/.test(char)) {
    console.log(`${char} ${stack}`);
  }
  
  if (isStringMode) {
    if (char == '"') {
      isStringMode = false;
    } else {
      stack.push(char);
    }
    process.nextTick(next);
    return;
  }
  
  switch (char) {
    // Number
    case "0":
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      stack.push(parseInt(char, 10));
      break;
    // Right
    case ">":
      dir = "right";
      break;
    // Left
    case "<":
      dir = "left";
      break;
    // Up
    case "^":
      dir = "up";
      break;
    // Down
    case "v":
      dir = "down";
      break;
    // Vertical If
    case "|":
      dir = (stack.pop()) ? "up" : "down";
      break;
    // Horizontal If
    case "_":
      dir = (stack.pop()) ? "left" : "right";
      break;
    // Add
    case "+":
      stack.push(toNumber(stack.pop()) + toNumber(stack.pop()));
      break;
    // Subtract
    case "-": {
      let a = toNumber(stack.pop());
      let b = toNumber(stack.pop());
      stack.push(b - a);
      break;
    }
    // Multiply
    case "*":
      stack.push(toNumber(stack.pop()) * toNumber(stack.pop()));
      break;
    // Divide
    case "/": {
      let a = toNumber(stack.pop());
      let b = toNumber(stack.pop());
      stack.push(b / a);
      break;
    }
    // Modulo
    case "%": {
      let a = toNumber(stack.pop());
      let b = toNumber(stack.pop());
      // Work around broken JavaScript implementation of modulo operator
      stack.push(((b % a) + a) % a);
      break;
    }
    // Swap
    case "\\": {
      let a = stack.pop();
      let b = stack.pop();
      stack.push(a);
      stack.push(b);
      break;
    }
    // Copy
    case ":": {
      let a = stack.pop();
      stack.push(a);
      stack.push(a);
      break;
    }
    // Output as integer followed by space
    case ".": {
      let number = toNumber(stack.pop());
      if (!isDebugMode) {
        process.stdout.write(`${number} `);
      }
      break;
    }
    // Output as ASCII character
    case ",": {
      let char = toASCII(stack.pop());
      if (isDebugMode) {
        console.log(`=> ${char}`);
      } else {
        process.stdout.write(char);
      }
      break;
    }
    // Ask for number
    case "&":
      prompt((char) => {
        stack.push(toNumber(char));
        next();
      });
      return;
    // Ask for ASCII character
    case "~":
      prompt().then((char) => {
        stack.push(toASCII(char));
        next();
      });
      return;
    case '"':
      isStringMode = true;
      break;
    // Not
    case "!":
      stack.push((stack.pop()) ? 0 : 1);
      break;
    // Greater-than
    case "`": {
      let b = stack.pop();
      let a = stack.pop();
      stack.push(a > b);
      break;
    }
    // Throw away stack item
    case "$":
      stack.pop();
      break;
    // Move in random direction
    case "?":
      let dirs = ["right", "left", "up", "down"];
      let rnd = (Math.random() * 4) >> 0;
      dir = dirs[rnd];
      break;
    // Skip next character
    case "#":
      move();
      break;
    // Get ASCII character
    case "g": {
      let y = toNumber(stack.pop());
      let x = toNumber(stack.pop());
      stack.push(toASCII(get(x, y)));
      break;
    }
    // Put character
    case "p": {
      let y = toNumber(stack.pop());
      let x = toNumber(stack.pop());
      let v = stack.pop();
      put(x, y, v);
      break;
    }
    // Exit
    case "@":
      return;
  }
  
  process.nextTick(next);
}

if (process.argv.length < 3) {
  console.error("Missing argument");
  process.exit(1);
}

try {
  let content = fs.readFileSync(process.argv[process.argv.length - 1], "ascii");
  input = content.split("\n").map((str) => str.split(""));
  next();
} catch (ex) {
  console.error("Invalid file");
  process.exit(1);
}
