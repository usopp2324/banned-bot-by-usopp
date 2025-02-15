const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const prefix = "!";
const fixedRoleID = ""; //role banned id 
const fixedChannelID = ""; //channel id for logs
const dataFile = "bannedUsers.json";

// تحميل البيانات المحفوظة
let bannedUsers = {};
if (fs.existsSync(dataFile)) {
    bannedUsers = JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

client.on("messageCreate", async (message) => {
    const username = message.author.username; // اسم المستخدم بدون التاغ
    const tag = message.author.tag; // اسم المستخدم مع التاغ (User#1234)
    const userId = message.author.id; // معرف المستخدم (ID)

    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply("You do not have permission to manage ranks! ❌");
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply("I do not have permission to manage ranks! ❌");

        let userID = args[0];
        let timeString = args[1];
        let reason = args.slice(2).join(" ") || "No specific reason.";
        let member = await message.guild.members.fetch(userID).catch(() => null);
        if (!member) return message.reply("This member was not found on the server! ❌");

        let role = message.guild.roles.cache.get(fixedRoleID);
        if (!role) return message.reply("The specified rank was not found! ❌");
        if (role.position >= message.guild.members.me.roles.highest.position) return message.reply("I cannot give this rank because it is higher than my rank!❌");

        function parseTime(timeStr) {
            let regex = /(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
            let matches = regex.exec(timeStr);
            const days = (matches[1] || 0);
            const hours = (matches[2] || 0);
            const minutes = (matches[3] || 0);
            const seconds = (matches[4] || 0);
            return (days * 86400000) + (hours * 3600000) + (minutes * 60000) + (seconds * 1000);
        }
        let time = parseTime(timeString);
        if (isNaN(time) || time <= 0) return message.reply("Invalid time! ❌");

        const oldRoles = member.roles.cache.map(r => r.id);
        await member.roles.set([]); // إزالة جميع الأدوار الحالية
        await member.roles.add(role); // إضافة الدور المحدد

        bannedUsers[userID] = { oldRoles, endTime: Date.now() + time, reason, originalTime: timeString }; // إضافة timeString

        fs.writeFileSync(dataFile, JSON.stringify(bannedUsers, null, 2));

        const channel = await message.guild.channels.fetch(fixedChannelID);
        if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('FF0000')
                .setAuthor({name : `banned by ${(message.author.username)}`, iconURL : message.author.avatarURL() })
                .setThumbnail("https://images-ext-1.discordapp.net/external/w3rOmfm98EMJwAIkXBZGMXYQfHd94jndaV10fmosHgw/https/i.pinimg.com/736x/a0/a1/05/a0a105da7718e1a18b1943a4ea1eec58.jpg?format=webp")
                .setTitle(` <a:39861crownpurple:1332338810964672525> **Midnight City Roleplay** <a:39861crownpurple:1332338810964672525> \n \n \n `)
                .setDescription(`**Member banned** : <@${member.user.id}> \n \n <:Ban_Hammer:1329014661760286761> ** Ban end in **: ${timeString}\n \n 📝 **Reason**: ${reason}\n\n <a:2908mcdying:1319800066738753556> **Ban time :**: ${timeString}\n\n ** All roles has been rovoked ** \n \n **When The Ban end you can join the server fivem again**`) // إضافة الوقت الأصلي
                .setImage("https://media.discordapp.net/attachments/1339009646115160104/1339069714604757052/bAN.gif?ex=67af5b9a&is=67ae0a1a&hm=0b7053c01b32b2842887c7bbdd2bba1e7cdeb8e75a80cfae9019ce50fe845a36&=")
                .setFooter({ text : message.guild.name , iconURL : message.guild.iconURL() })
                .setTimestamp();
            let sentEmbed = await channel.send({ embeds: [embed] });

            // تحديث العد التنازلي كل ثانية 
            let interval = setInterval(async () => {
                // تحقق مما إذا كان المستخدم موجودًا في البيانات أولاً
                if (!bannedUsers[userID]) {
                    clearInterval(interval);
                    return;
                }

                let timeLeft = bannedUsers[userID].endTime - Date.now();
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    return;
                }
                let days = Math.floor(timeLeft / 86400000);
                let hours = Math.floor((timeLeft % 86400000) / 3600000);
                let minutes = Math.floor((timeLeft % 3600000) / 60000);
                let seconds = Math.floor((timeLeft % 60000) / 1000);

                let formattedTime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                sentEmbed = await sentEmbed.edit({
                    embeds: [
                        new EmbedBuilder(sentEmbed.embeds[0].data)
                        .setDescription(`**Member banned** : <@${member.user.id}> \n \n <:Ban_Hammer:1329014661760286761> ** Ban end in **: ${formattedTime}\n \n 📝 **Reason**: ${reason}\n\n <a:2908mcdying:1319800066738753556> **Ban time :**: ${timeString}\n\n ** All roles has been rovoked ** \n \n **When The Ban end you can join the server fivem again**`) // إضافة الوقت الأصلي                    
                    ]
                });
            }, 1000);
        }

        // استخدم interval بدلاً من setTimeout للحسابات الطويلة
        let remainingTime = bannedUsers[userID].endTime - Date.now();
        let intervalId = setInterval(async () => {
            if (!bannedUsers[userID]) {
                clearInterval(intervalId);
                return;
            }

            if (remainingTime <= 0) {
                clearInterval(intervalId);
                await member.roles.set(bannedUsers[userID].oldRoles);
                delete bannedUsers[userID];
                fs.writeFileSync(dataFile, JSON.stringify(bannedUsers, null, 2));

                if (channel && channel.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setColor('00FF00')
                        .setAuthor({name : `unban by **${client.user.username}**`})
                        .setImage("https://media.discordapp.net/attachments/1339009646115160104/1339069714604757052/bAN.gif?ex=67af5b9a&is=67ae0a1a&hm=0b7053c01b32b2842887c7bbdd2bba1e7cdeb8e75a80cfae9019ce50fe845a36&=")
                        .setTitle(` Role Restored for  ✅  <@${member.user.id}>`)
                        .setThumbnail(client.user.avatarURL())
                        .setDescription(` <@${member.user.id}> **You Have Been Unbaned from the server You can join us now !** `)
                        .setTimestamp();
                    channel.send({ embeds: [embed] });
                }
            }
            if (!bannedUsers[userID]) {
                console.log(`Error: User ${userID} is not in bannedUsers.`);
                clearInterval(intervalId); 
                return; 
            }
            remainingTime = bannedUsers[userID].endTime - Date.now();
            
        }, 10000); // يتم التحقق كل 10 ثوانٍ بدلاً من انتظار كامل الوقت.

    }

    if (command === "unban") {
        let userID = args[0];
        if (!userID || !bannedUsers[userID]) return message.reply("User is not banned or invalid ID.");

        let member = await message.guild.members.fetch(userID).catch(() => null);
        if (!member) return message.reply("User not found in the server.");

        await member.roles.set(bannedUsers[userID].oldRoles);
        delete bannedUsers[userID];
        fs.writeFileSync(dataFile, JSON.stringify(bannedUsers, null, 2));

        const channel = await message.guild.channels.fetch(fixedChannelID);
        if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor('00FF00')
                .setTitle(`🚪 User **${member.user.tag}** Unbanned`)
                .setDescription("Roles have been restored manually.")
                .setTimestamp();
            channel.send({ embeds: [embed] });
        }
        message.reply(`✅ **${member.user.tag}** has been unbanned successfully!`);
    }
});

client.login(""); //TOKEN for ur bot
