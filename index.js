//const { get } = require("request-promise-native");
const { MessageEmbed } = require("discord.js");
const db = require("quick.db");
const { Collection, Client, Discord } = require("discord.js");
const fs = require("fs");
const bot = new Client({
  disableEveryone: true
});
const {format} = require('timeago.js')

var express = require("express");
var app = express();

app.get("/", (request, response) => {
  response.sendStatus(200);
});
app.listen(process.env.PORT);

const config = require("./config.json");

bot.commands = new Collection();
const TOKEN = process.env.TOKEN;
bot.aliases = new Collection();
bot.categories = fs.readdirSync("./commands/");

bot.prefix = config.prefix;
["command"].forEach(handler => {
  require(`./handlers/${handler}`)(bot);
});

bot.on("ready", async () => {
  
  const status = `DM for Support` // set your custom status here!
  bot.user.setActivity(status, { type: "WATCHING" });
  console.log(`Logged in as ${bot.user.tag}`)
  let allData = db.all().filter(data => data.ID.startsWith('isCreated_'))
  allData.forEach(data => {
    let id = data.ID.split('_')[1]
    db.delete(`isCreated_` + id)
  }) // to avoid user won't be able to open ticket if the bot crash
  
});

bot.on("message", async message => {

  let prefix = config.prefix
    
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };
    
  if (message.author.bot) return;
  
  if (message.content.toLowerCase().startsWith(prefix)) {
    
    return;
    const members = db.fetch(`members`)
    if (!message.guild) return;
    if (!message.member) message.member = await message.guild.fetchMember(message);
    
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    
    if (cmd.length == 0) return;
    let command 
    if(bot.commands.has(cmd)) command = bot.commands.get(cmd)
    else command = bot.commands.get(bot.aliases.get(cmd))
    
    try {     
      command.run(bot, message, args)
    }catch(err) {
      return;   
    }
    
  }else{
    if(message.channel.type === 'dm') { // Check if the channel type is dm
      let isCreated = db.fetch(`isCreated_` + message.author.id) // check if the user is currently talking with someone, if the user isn't it will create a new thread
      if(isCreated === true) return;
      let Embed = new MessageEmbed()
      .setAuthor(`Thread has been created`, bot.user.displayAvatarURL())
      .setDescription(`Thank you for contacting Support. Please wait while we find a suitable staff to help you`)
      .setFooter('Your message has been sent')
      .setTimestamp()
      .setColor('#8b64e3')
      message.author.send(Embed)
      let guild = bot.guilds.cache.get(config.serverID)
      let ch = await guild.channels.create(`${message.author.username}-${message.author.discriminator}`) // create new channel
      ch.setParent(config.supportCategoryID)
      ch.overwritePermissions([{
        id: guild.roles.everyone.id,
        deny: ['VIEW_CHANNEL']
      }, {
        id: config.staffRoleID,
        allow: ['VIEW_CHANNEL']
      }])
      let support = new MessageEmbed()
      .setAuthor(`${message.author.username} - ${message.author.discriminator}`, message.author.displayAvatarURL())
      .setDescription(`**Account** was created ${format(message.author.createdTimestamp)}`)
      .setFooter(`User ID : ${message.author.id}`)
      .setTimestamp()
      .setColor('#8b64e3')
      ch.send(support)
      let me = new MessageEmbed()
      .setAuthor(message.author.tag, message.author.displayAvatarURL())
      .setDescription(message.content)
      .setColor('#8b64e3')
      .setFooter(`Message ID : ${message.id}`)
      ch.send(me)
      const collector = ch.createMessageCollector(m => !m.author.bot) // send all messages from the new channel into user's dm
      collector.on('collect', async msg => {
        let args = msg.content.slice(1).trim().split(/ +/g)
        let command = args.shift().toLowerCase()
        switch(command) {
          case 'r': { // command to reply to user
            let embed = new MessageEmbed()
            .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
            .setDescription(args.join(" "))
            .setFooter(`Cosmic Advertising Staff Member`)
            .setColor('#8b64e3')
            message.author.send(embed)
            msg.delete()
            msg.channel.send(embed)
            break;
          }
          case 'ar': { // anonymous reply
            let embed = new MessageEmbed()
            .setAuthor(`Staff Team`, bot.user.displayAvatarURL())
            .setDescription(args.join(" "))
            .setFooter(`Cosmic Advertising Staff Member`)
            .setColor('#8b64e3')
            message.author.send(embed)
            msg.delete()
            msg.channel.send(embed)
            break;
          }
          case 'close': { // close the current thread, staff only command
            let m = await msg.channel.send(new MessageEmbed().setAuthor(`Are you sure you want to close the thread?`, bot.user.displayAvatarURL()).setColor('#8b64e3'))
            m.react(':CA_tick:746658794322264165')
            m.react(':CA_redtick:746658877679992832')
            const reaction = m.createReactionCollector((reaction, user) => user.id === msg.author.id)
            reaction.on('collect', async (reaction, user) => {
              if(reaction.emoji.id === '746658794322264165') {
                ch.delete();
                let e = new MessageEmbed()
                .setAuthor('Thread Closed', bot.user.displayAvatarURL())
                .setDescription(`Thread has been closed. Feel free to send another message if you need further assitance`)
                .setFooter(`Replying will create a new thread`)
                .setTimestamp()
                .setColor('#e81515')
                message.author.send(e)
                db.delete(`isCreated_` + message.author.id)
              }else if(reaction.emoji.id === '746658877679992832') {
                m.delete();
              }else return;
            })
            break;
          }
        }
      })
      const collector2 = message.channel.createMessageCollector(m => m.author.id === message.author.id)
      collector2.on('collect', async msg => { // create a message collector in user's dm so the message will be sent into the new channel
        let embed = new MessageEmbed()
        .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
        .setDescription(msg.content)
        .setFooter(`Message ID : ${msg.id}`)
        .setColor('#8b64e3')
        ch.send(embed)
        msg.react(':CA_tick:746658794322264165')
      })
      db.set(`isCreated_` + message.author.id, true)
    }
  }
  
});

bot.login(config.token);
