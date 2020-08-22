const {MessageEmbed, MessageAttachment} = require('discord.js')
const Canvas = require('canvas');
const fs = require('fs')
const db = require('quick.db')
module.exports = {
  name: 'help',
  description: "Shows info about all command",
  category: "info",
  run: async (bot, message, args) => {
    return;
  }
}