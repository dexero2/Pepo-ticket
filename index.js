const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, Routes, REST, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, AttachmentBuilder } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const fs = require('fs');
const path = require('path');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel, Partials.Message, Partials.User],
});

// ملف قاعدة البيانات JSON
const DB_FILE = path.join(__dirname, 'tickets_db.json');

// تحميل قاعدة البيانات أو إنشاؤها إذا لم تكن موجودة
let ticketsData = {
    activeTickets: {}, // {userId: channelId}
    totalTickets: 0
};

// التأكد من وجود ملف قاعدة البيانات
if (fs.existsSync(DB_FILE)) {
    try {
        ticketsData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (error) {
        console.error('خطأ في قراءة ملف قاعدة البيانات:', error);
    }
}

// حفظ البيانات
function saveData() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(ticketsData, null, 2));
    } catch (error) {
        console.error('خطأ في حفظ قاعدة البيانات:', error);
    }
}

const TOKEN = process.env.TOKEN || 'MTMzOTY2OTE0MDU4Mjk1NzA1Ng.GvgxxK.bRwDjGKnbSqWDiQS934f3R6OEK9n5I8z-4ucw4'; // استخدم متغير البيئة للتوكن
const CLIENT_ID = '1339669140582957056';
const GUILD_ID = '1337810861783388202';

// تخزين حالة الأزرار والإعدادات
const settings = {
    buttons: {
        report: true,
        ads: true,
        partner: true,
        apply: true
    },
    logChannel: null,
    permissions: {
        report: [],
        ads: [],
        partner: [],
        apply: []
    },
    categories: {
        report: null,
        ads: null,
        partner: null,
        apply: null
    },
    acceptRoles: [], // Roles to add on acceptance
    customMessages: { // Custom messages for acceptance and rejection
        accept: null,
        reject: null
    }
};

// تسجيل الأوامر
const commands = [
    new SlashCommandBuilder()
        .setName('send')
        .setDescription('إرسال رسالة التذاكر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('turn')
        .setDescription('تشغيل/إيقاف أزرار التذاكر')
        .addStringOption(option =>
            option.setName('button')
                .setDescription('اسم الزر')
                .setRequired(true)
                .addChoices(
                    { name: 'إعلانات', value: 'ads' },
                    { name: 'بارتنر', value: 'partner' },
                    { name: 'تقديم إدارة', value: 'apply' }
                ))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('الوضع')
                .setRequired(true)
                .addChoices(
                    { name: 'تشغيل', value: 'on' },
                    { name: 'إيقاف', value: 'off' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('log')
        .setDescription('تحديد قناة اللوج')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('permission')
        .setDescription('تحديد أذونات لرؤية التذاكر')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('الدور المطلوب')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('button')
                .setDescription('اسم الزر')
                .setRequired(true)
                .addChoices(
                    { name: 'إبلاغ', value: 'report' },
                    { name: 'إعلانات', value: 'ads' },
                    { name: 'بارتنر', value: 'partner' },
                    { name: 'تقديم إدارة', value: 'apply' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('setcategory')
        .setDescription('تحديد فئة لنوع معين من التذاكر')
        .addStringOption(option =>
            option.setName('button')
                .setDescription('نوع التذكرة')
                .setRequired(true)
                .addChoices(
                    { name: 'إبلاغ', value: 'report' },
                    { name: 'إعلانات', value: 'ads' },
                    { name: 'بارتنر', value: 'partner' },
                    { name: 'تقديم إدارة', value: 'apply' }
                ))
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('فئة القنوات')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('setacceptrole')
        .setDescription('تحديد دور قبول الطلبات')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('الدور الأول')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role2')
                .setDescription('الدور الثاني (اختياري)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('setmessage')
        .setDescription('تحديد رسائل مخصصة')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('نوع الرسالة (accept, reject)')
                .setRequired(true)
                .addChoices(
                    { name: 'قبول', value: 'accept' },
                    { name: 'رفض', value: 'reject' }
                ))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('الرسالة')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('settranscript')
        .setDescription('تحديد قناة حفظ النسخ')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

];

const rest = new REST({ version: '10' }).setToken(TOKEN);

// إضافة أمر لمسح الأوامر وإعادة تسجيلها
commands.push(
    new SlashCommandBuilder()
        .setName('resetcommands')
        .setDescription('مسح جميع أوامر البوت وإعادة تسجيلها')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
);

async function registerCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

async function deleteAllCommands() {
    try {
        console.log('Started deleting all application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
        console.log('Successfully deleted all application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

// تسجيل الأوامر عند بدء البوت
registerCommands();

// تشغيل البوت
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    // Set the bot's presence to streaming mode with "Developer Dexero"
    client.user.setPresence({
        activities: [{
            name: 'Developer Dexero',
            type: 1, // 1 is for STREAMING type
            url: 'https://www.twitch.tv/dexero' // Required for streaming status
        }],
        status: 'online'
    });
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        if (interaction.commandName === 'resetcommands') {
            await interaction.deferReply({ ephemeral: true });

            try {
                await deleteAllCommands();
                await new Promise(resolve => setTimeout(resolve, 2000)); // انتظار لمدة ثانيتين
                await registerCommands();

                await interaction.editReply({
                    content: 'تم مسح جميع أوامر البوت وإعادة تسجيلها بنجاح!',
                    ephemeral: true
                });
            } catch (error) {
                console.error('خطأ في إعادة تسجيل الأوامر:', error);
                await interaction.editReply({
                    content: 'حدث خطأ أثناء إعادة تسجيل الأوامر. الرجاء مراجعة سجل الخادم.',
                    ephemeral: true
                });
            }
        } else if (interaction.commandName === 'send') {
            // إرسال رسالة مخفية
            await interaction.reply({ content: 'تم إرسال الرسالة.', ephemeral: true });

            // إنشاء الإيمبد
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('pepo sp black')
                .setDescription('**🔎 يمكنك سحب تذكرة لـ التواصل مع المسئولين لـ الابلاغ عن مشكلة ما  🔎**\n\n1. اولًا..  للابلاغ عن شخص يخالف القواعد المذكورة في غرفة القوانين.\n2. ثانيًا.. الاستفسار عن اي سؤال متعلق بـ سيرفر الديسكورد\n3. ثالثًا.. الابلاغ عن مشاكل في السيرفر\n4. رابعًا.. التبليغ عن حالة سرقة او نصب او قرصنة (هكرز)\n5. خامسًا.. التبليغ عن تلقي عقوبة بشكل خاطيء (مثل التحذير او الميوت او الطرد)\n\n>  ⛔️ **يُرجي عدم فتح التيكت وتركها لفترة طويلة - ويُرجي عدم فتح التيكت**\n>  **عدم فتح  التيكت لغرض المزح او شي اخر يعرض⛔**')
                .setImage('https://cdn.discordapp.com/attachments/1063097757939794040/1327715019999154260/--.webp?ex=67d13238&is=67cfe0b8&hm=fbf76e77c1a47e6fcf44a6a1c0ea938af15e121db912bb1e2f6301d5913efedb&') // You need to upload this image to Discord and use its URL
                .setFooter({ text: 'نظام التذاكر | Developer Dexero' });

            // إنشاء الأزرار
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('report')
                        .setLabel('إبلاغ')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ads')
                        .setLabel('إعلانات')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('partner')
                        .setLabel('بارتنر')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('apply')
                        .setLabel('تقديم إدارة')
                        .setStyle(ButtonStyle.Secondary)
                );

            // إرسال الرسالة
            const channel = interaction.channel;
            await channel.send({ embeds: [embed], components: [row] });
        }

        if (interaction.commandName === 'turn') {
            const button = interaction.options.getString('button');
            const mode = interaction.options.getString('mode');

            // تحديث حالة الزر
            settings.buttons[button] = (mode === 'on');

            await interaction.reply({ 
                content: `تم تحديث حالة زر ${button} إلى ${mode === 'on' ? 'مفعل' : 'معطل'}.`,
                ephemeral: true 
            });
        }

        if (interaction.commandName === 'log') {
            const channel = interaction.options.getChannel('channel');
            settings.logChannel = channel.id;
            await interaction.reply({
                content: `تم تحديد قناة اللوج: ${channel}.`,
                ephemeral: true
            });
        }

        if (interaction.commandName === 'permission') {
            const role = interaction.options.getRole('role');
            const button = interaction.options.getString('button');

            // إضافة الدور إلى قائمة الأدوار التي يمكنها رؤية التذاكر
            if (!settings.permissions[button].includes(role.id)) {
                settings.permissions[button].push(role.id);
            }

            await interaction.reply({
                content: `تم تحديث صلاحيات زر ${button} للدور ${role}.`,
                ephemeral: true
            });
        }

        if (interaction.commandName === 'setcategory') {
            const button = interaction.options.getString('button');
            const category = interaction.options.getChannel('category');

            // التحقق من أن القناة المحددة هي فئة
            if (category.type !== ChannelType.GuildCategory) {
                return await interaction.reply({
                    content: 'يجب اختيار فئة (category) وليس قناة عادية.',
                    ephemeral: true
                });
            }

            // حفظ معرف الفئة
            settings.categories[button] = category.id;

            await interaction.reply({
                content: `تم تعيين فئة ${category.name} لتذاكر ${getButtonNameArabic(button)}.`,
                ephemeral: true
            });
        }
        if (interaction.commandName === 'setacceptrole') {
            const role = interaction.options.getRole('role');
            const role2 = interaction.options.getRole('role2');

            // إعادة تعيين القائمة
            settings.acceptRoles = [];

            // إضافة الرتبة الأولى
            settings.acceptRoles.push(role.id);

            let responseMessage = `تم تعيين دور ${role} كدور قبول.`;

            // إضافة الرتبة الثانية إذا تم تحديدها
            if (role2) {
                settings.acceptRoles.push(role2.id);
                responseMessage += ` وتم إضافة دور ${role2} أيضاً.`;
            }

            await interaction.reply({ content: responseMessage, ephemeral: true });
        }
        if (interaction.commandName === 'setmessage') {
            const type = interaction.options.getString('type');
            const message = interaction.options.getString('message');
            settings.customMessages[type] = message;
            await interaction.reply({ content: `تم تحديث رسالة ${type}.`, ephemeral: true });
        }
        if (interaction.commandName === 'settranscript') {
            const channel = interaction.options.getChannel('channel');
            settings.transcriptChannel = channel.id;
            await interaction.reply({ content: `تم تعيين قناة حفظ النسخ: ${channel}`, ephemeral: true});
        }
    } else if (interaction.isButton()) {
        // التحقق من أن الزر مفعل
        if (interaction.customId in settings.buttons && !settings.buttons[interaction.customId]) {
            return await interaction.reply({ 
                content: 'هذا الزر معطل حالياً.', 
                ephemeral: true 
            });
        }

        if (interaction.customId === 'report') {
            const menu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('report_menu')
                        .setPlaceholder('اختر نوع البلاغ')
                        .addOptions([
                            { label: 'بلاغ عن عضو', value: 'member_report' },
                            { label: 'بلاغ عن إداري', value: 'admin_report' },
                        ])
                );

            await interaction.reply({ content: 'اختر نوع البلاغ:', components: [menu], ephemeral: true });
        } else if (interaction.customId === 'ads') {
            const menu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('ads_menu')
                        .setPlaceholder('اختر نوع الإعلان')
                        .addOptions([
                            { label: 'دايموند', value: 'diamond' },
                            { label: 'جولد', value: 'gold' },
                            { label: 'إيميرالد', value: 'emerald' },
                        ])
                );

            await interaction.reply({ content: 'اختر نوع الإعلان:', components: [menu], ephemeral: true });
        } else if (interaction.customId === 'partner') {
            // إنشاء تذكرة شراكة مباشرة
            await createTicket(interaction, 'partner', 'شراكة');
        } else if (interaction.customId === 'apply') {
            const modal = new ModalBuilder()
                .setCustomId('apply_modal')
                .setTitle('تقديم إدارة');

            // إنشاء مكونات ActionRow لكل مدخل نص
            const nameInput = new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('اسمك')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            );

            const ageInput = new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('age')
                    .setLabel('عمرك')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            );

            const experienceInput = new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('experience')
                    .setLabel('خبراتك')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            );

            const reasonInput = new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reason')
                    .setLabel('لماذا اخترت السيرفر؟')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
            );

            const activityInput = new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('activity')
                    .setLabel('مدة التفاعل')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            );

            // إضافة جميع الصفوف إلى النموذج
            modal.addComponents(nameInput, ageInput, experienceInput, reasonInput, activityInput);

            await interaction.showModal(modal);
        }
    } else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'report_menu') {
            const selectedValue = interaction.values[0];
            let ticketType = '';

            if (selectedValue === 'member_report') {
                ticketType = 'بلاغ-عضو';
            } else if (selectedValue === 'admin_report') {
                ticketType = 'بلاغ-إداري';
            }

            await createTicket(interaction, 'report', ticketType);
        } else if (interaction.customId === 'ads_menu') {
            const selectedValue = interaction.values[0];
            let ticketType = '';

            if (selectedValue === 'diamond') {
                ticketType = 'إعلان-دايموند';
            } else if (selectedValue === 'gold') {
                ticketType = 'إعلان-جولد';
            } else if (selectedValue === 'emerald') {
                ticketType = 'إعلان-إيميرالد';
            }

            await createTicket(interaction, 'ads', ticketType);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'apply_modal') {
            // الحصول على البيانات من النموذج
            const name = interaction.fields.getTextInputValue('name');
            const age = interaction.fields.getTextInputValue('age');
            const experience = interaction.fields.getTextInputValue('experience');
            const reason = interaction.fields.getTextInputValue('reason');
            const activity = interaction.fields.getTextInputValue('activity');

            // إنشاء تذكرة تقديم إدارة
            const ticket = await createTicket(interaction, 'apply', 'تقديم-إدارة');

            if (ticket) {
                // إنشاء إيمبد بالبيانات
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('طلب تقديم إدارة')
                    .setDescription(`تم تقديم الطلب بواسطة ${interaction.user}`)
                    .addFields(
                        { name: 'الاسم', value: name },
                        { name: 'العمر', value: age },
                        { name: 'الخبرات', value: experience },
                        { name: 'سبب الاختيار', value: reason },
                        { name: 'مدة التفاعل', value: activity }
                    )
                    .setTimestamp();

                // إنشاء أزرار القبول والرفض
                const actionRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('accept_application')
                            .setLabel('قبول')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('reject_application')
                            .setLabel('رفض')
                            .setStyle(ButtonStyle.Danger)
                    );

                // إرسال الإيمبد وأزرار القبول/الرفض في التذكرة
                await ticket.send({ embeds: [embed], components: [actionRow] });

                // إرسال رسالة تأكيد للمستخدم
                const confirmEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('تم تقديم طلبك')
                    .setDescription('تم استلام طلب التقديم الخاص بك وسيتم مراجعته من قبل الإدارة في أقرب وقت.')
                    .setTimestamp();

                await ticket.send({ content: `${interaction.user}`, embeds: [confirmEmbed] });
            }
        }
    }
});

/**
 * الحصول على الاسم العربي للزر
 * @param {string} buttonType - نوع الزر
 * @returns {string} الاسم العربي
 */
function getButtonNameArabic(buttonType) {
    switch (buttonType) {
        case 'report': return 'إبلاغ';
        case 'ads': return 'إعلانات';
        case 'partner': return 'بارتنر';
        case 'apply': return 'تقديم إدارة';
        default: return buttonType;
    }
}

/**
 * معالجة الرد على طلب التقديم (قبول/رفض)
 * @param {Interaction} interaction - التفاعل
 */
async function handleApplicationResponse(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const isAccepted = interaction.customId === 'accept_application';
        const messageId = interaction.message.id;
        const channel = interaction.channel;

        // البحث عن الرسالة التي تحتوي على معلومات التقديم
        const message = await channel.messages.fetch(messageId);

        // الحصول على معرف المتقدم ومعلوماته
        if (!message.embeds || message.embeds.length === 0) {
            return await interaction.editReply({ 
                content: 'لم يتم العثور على معلومات التقديم.', 
                ephemeral: true 
            });
        }

        // محاولة إيجاد معرف المستخدم من وصف الإيمبد
        let userId = null;
        const regex = /\<\@(\d+)\>/;
        const description = message.embeds[0].description;

        if (description && regex.test(description)) {
            const match = description.match(regex);
            userId = match[1];
        }

        if (!userId) {
            return await interaction.editReply({
                content: 'لم يتم العثور على معرف المتقدم.',
                ephemeral: true
            });
        }

        // الحصول على المستخدم والعضو
        const user = await client.users.fetch(userId).catch(() => null);
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!user) {
            return await interaction.editReply({
                content: 'لم يتم العثور على المستخدم.',
                ephemeral: true
            });
        }

        // معالجة القبول
        if (isAccepted) {
            const addedRoles = [];

            // محاولة إضافة الرتب
            if (member) {
                // استخدام الرتب المخصصة إذا تم تعيينها، وإلا استخدم الرتب الافتراضية
                const rolesToAdd = settings.acceptRoles.length > 0 ? 
                    settings.acceptRoles : 
                    // البحث عن الرتب بالاسم إذا لم يتم تعيين رتب مخصصة
                    interaction.guild.roles.cache
                        .filter(r => ['الإدارة', 'المشرفين'].includes(r.name))
                        .map(r => r.id);

                for (const roleId of rolesToAdd) {
                    const role = interaction.guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.add(role).catch(console.error);
                        addedRoles.push(role.name);
                    }
                }

                // استخدام الرسالة المخصصة إذا تم تعيينها
                const acceptMessage = settings.customMessages.accept || 'تهانينا! تم قبول طلب التقديم الخاص بك.';

                // إرسال رسالة للمتقدم
                await user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('تم قبول طلب التقديم')
                            .setDescription(`${acceptMessage} في سيرفر ${interaction.guild.name}.`)
                            .addFields(
                                { name: 'الرتب التي تم إضافتها', value: addedRoles.length > 0 ? addedRoles.join(', ') : 'لم يتم إضافة رتب.' }
                            )
                            .setTimestamp()
                    ]
                }).catch(console.error);

                // تحديث في القناة
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('تم قبول الطلب')
                            .setDescription(`تم قبول طلب ${user} من قبل ${interaction.user}.`)
                            .addFields(
                                { name: 'الرتب المضافة', value: addedRoles.length > 0 ? addedRoles.join(', ') : 'لم يتم إضافة رتب.' }
                            )
                            .setTimestamp()
                    ]
                });

                await interaction.editReply({
                    content: `تم قبول طلب التقديم بنجاح وإرسال إشعار للمستخدم ${user.tag}.`,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: `تم قبول الطلب، لكن لم يتم العثور على المستخدم في السيرفر لإضافة الرتب.`,
                    ephemeral: true
                });
            }
        } 
        // معالجة الرفض
        else {
            // استخدام الرسالة المخصصة إذا تم تعيينها
            const rejectMessage = settings.customMessages.reject || 'للأسف، تم رفض طلب التقديم الخاص بك.';

            // إرسال رسالة للمتقدم
            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('تم رفض طلب التقديم')
                        .setDescription(`${rejectMessage} في سيرفر ${interaction.guild.name}.`)
                        .setFooter({ text: 'يمكنك التقديم مرة أخرى في وقت لاحق.' })
                        .setTimestamp()
                ]
            }).catch(console.error);

            // تحديث في القناة
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('تم رفض الطلب')
                        .setDescription(`تم رفض طلب ${user} من قبل ${interaction.user}.`)
                        .setTimestamp()
                ]
            });

            await interaction.editReply({
                content: `تم رفض طلب التقديم وإرسال إشعار للمستخدم ${user.tag}.`,
                ephemeral: true
            });
        }

        // تعطيل الأزرار بعد الاستجابة
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_application')
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('reject_application')
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );

        await message.edit({ components: [disabledRow] });

    } catch (error) {
        console.error('خطأ في معالجة الاستجابة للتقديم:', error);
        if (interaction.deferred) {
            await interaction.editReply({
                content: 'حدث خطأ أثناء معالجة الطلب. الرجاء المحاولة مرة أخرى.',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'حدث خطأ أثناء معالجة الطلب. الرجاء المحاولة مرة أخرى.',
                ephemeral: true
            });
        }
    }
}

/**
 * وظيفة إنشاء تذكرة جديدة
 * @param {Interaction} interaction - التفاعل الذي أدى إلى إنشاء التذكرة
 * @param {string} category - فئة التذكرة (مثل report, ads, partner, apply)
 * @param {string} type - نوع التذكرة المحدد (مثل بلاغ عن عضو، إعلان دايموند، إلخ)
 * @returns {TextChannel|null} قناة التذكرة أو null في حالة الفشل
 */
async function createTicket(interaction, category, type) {
    try {
        const guild = interaction.guild;
        const user = interaction.user;

        // التحقق من عدم وجود تذكرة نشطة للمستخدم
        if (ticketsData.activeTickets[user.id]) {
            // التحقق من أن القناة لا تزال موجودة
            const existingChannel = guild.channels.cache.get(ticketsData.activeTickets[user.id]);
            if (existingChannel) {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ 
                        content: `لديك بالفعل تذكرة نشطة! ${existingChannel}`, 
                        components: [], 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        content: `لديك بالفعل تذكرة نشطة! ${existingChannel}`, 
                        ephemeral: true 
                    });
                }
                return null;
            } else {
                // إذا كانت القناة غير موجودة، قم بإزالتها من القائمة النشطة
                delete ticketsData.activeTickets[user.id];
                saveData();
            }
        }

        // الرد على المستخدم
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: `جارٍ إنشاء تذكرة ${type}...`, components: [], ephemeral: true });
        } else {
            await interaction.reply({ content: `جارٍ إنشاء تذكرة ${type}...`, ephemeral: true });
        }

        // إنشاء اسم للتذكرة
        const ticketName = `ticket-${type}-${user.username}`;

        // إنشاء نظرة عامة للأذونات
        const permissionOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            // إضافة الأدوار المسموح لها برؤية هذا النوع من التذاكر
            ...settings.permissions[category].map(roleId => ({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }))
        ];

        // تحديد الفئة المناسبة
        const categoryOptions = {};
        if (settings.categories[category]) {
            const categoryChannel = guild.channels.cache.get(settings.categories[category]);
            if (categoryChannel) {
                categoryOptions.parent = categoryChannel.id;
            }
        }

        // إنشاء قناة التذكرة
        const channel = await guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            permissionOverwrites: permissionOverwrites,
            parent: categoryOptions.parent,
            reason: `تذكرة ${type} أنشأها ${user.tag}`
        });

        // إنشاء وصف أولي للتذكرة
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`تذكرة ${type}`)
            .setDescription(`هذه تذكرة من نوع ${type} أنشأها ${user}.`)
            .setTimestamp();

        // إنشاء زر إغلاق التذكرة
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('إغلاق التذكرة')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ embeds: [embed], components: [row] });

        // إرسال رسالة في قناة اللوج إذا كانت محددة
        if (settings.logChannel) {
            const logChannel = guild.channels.cache.get(settings.logChannel);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`تم إنشاء تذكرة جديدة`)
                    .setDescription(`نوع التذكرة: ${type}\nأنشأها: ${user}\nرابط: ${channel}`)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        // إضافة التذكرة إلى قاعدة البيانات
        ticketsData.activeTickets[user.id] = channel.id;
        ticketsData.totalTickets++;
        saveData();

        // التحديث النهائي للمستخدم
        await interaction.editReply({ 
            content: `تم إنشاء تذكرة ${type} بنجاح! ${channel}`, 
            ephemeral: true 
        });

        return channel;
    } catch (error) {
        console.error('خطأ في إنشاء التذكرة:', error);
        await interaction.editReply({ 
            content: 'حدث خطأ أثناء إنشاء التذكرة. الرجاء المحاولة مرة أخرى.', 
            ephemeral: true 
        });
        return null;
    }
}

// معالجة زر إغلاق التذكرة
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        try {
            const channel = interaction.channel;

            // التحقق من أن القناة هي قناة تذكرة
            if (!channel.name.startsWith('ticket-')) {
                return await interaction.reply({ 
                    content: 'هذه ليست قناة تذكرة صالحة.', 
                    ephemeral: true 
                });
            }

            // إنشاء زرين: تأكيد الإغلاق وإلغاء
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_close')
                        .setLabel('تأكيد الإغلاق')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_close')
                        .setLabel('إلغاء')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({
                content: 'هل أنت متأكد من رغبتك في إغلاق هذه التذكرة؟',
                components: [row],
                ephemeral: true
            });
        } catch (error) {
            console.error('خطأ في معالجة إغلاق التذكرة:', error);
            await interaction.reply({ 
                content: 'حدث خطأ أثناء معالجة الطلب. الرجاء المحاولة مرة أخرى.', 
                ephemeral: true 
            });
        }
    } else if (interaction.customId === 'create_transcript') {
        try {
            await interaction.deferReply({ ephemeral: true });

            const channel = interaction.channel;

            // إنشاء نسخة HTML احترافية باستخدام المكتبة
            const transcript = await discordTranscripts.createTranscript(channel, {
                limit: 100, // عدد الرسائل
                fileName: `${channel.name}-${Date.now()}.html`, // اسم الملف
                poweredBy: false, // إزالة الشعار الترويجي
                saveImages: true, // حفظ الصور داخل النسخة
                footerText: `تم إنشاء النسخة بواسطة ${interaction.user.tag}`, // نص التذييل
            });

            // إنشاء إيمبد وصفي للنسخة
            const transcriptEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('نسخة المحادثة')
                .setDescription(`تم إنشاء نسخة للتذكرة ${channel.name} بواسطة ${interaction.user}`)
                .addFields(
                    { name: 'اسم القناة', value: channel.name },
                    { name: 'تاريخ الإنشاء', value: new Date().toLocaleString('ar-EG') }
                )
                .setTimestamp();

            // إرسال النسخة إلى القناة
            await channel.send({
                embeds: [transcriptEmbed],
                files: [transcript]
            });

            // إرسال نسخة إلى قناة اللوج إذا كانت محددة
            if (settings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(settings.logChannel);
                if (logChannel) {
                    await logChannel.send({
                        embeds: [transcriptEmbed],
                        files: [transcript]
                    });
                }
            }

            await interaction.editReply({ 
                content: 'تم إنشاء نسخة للمحادثة بنجاح.', 
                ephemeral: true 
            });
        } catch (error) {
            console.error('خطأ في إنشاء نسخة المحادثة:', error);
            await interaction.editReply({ 
                content: 'حدث خطأ أثناء إنشاء نسخة المحادثة. الرجاء المحاولة مرة أخرى.', 
                ephemeral: true 
            });
        }
    } else if (interaction.customId === 'confirm_close') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const channel = interaction.channel;

            // البحث عن صاحب التذكرة
            let ticketOwnerId = null;

            // البحث في قاعدة البيانات عن صاحب التذكرة
            for (const [userId, channelId] of Object.entries(ticketsData.activeTickets)) {
                if (channelId === channel.id) {
                    ticketOwnerId = userId;
                    break;
                }
            }

            // إنشاء نسخة HTML احترافية قبل إغلاق التذكرة
            let transcript = null;
            let transcriptEmbed = null;

            try {
                // إنشاء نسخة HTML احترافية باستخدام المكتبة
                transcript = await discordTranscripts.createTranscript(channel, {
                    limit: 100, // عدد الرسائل
                    fileName: `${channel.name}-closed-${Date.now()}.html`, // اسم الملف
                    poweredBy: false, // إزالة الشعار الترويجي
                    saveImages: true, // حفظ الصور داخل النسخة
                    footerText: `تم إغلاق التذكرة بواسطة ${interaction.user.tag}`, // نص التذييل
                });

                // إنشاء إيمبد وصفي للنسخة
                transcriptEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('نسخة المحادثة عند الإغلاق')
                    .setDescription(`نسخة من التذكرة ${channel.name} قبل إغلاقها بواسطة ${interaction.user}`)
                    .addFields(
                        { name: 'اسم القناة', value: channel.name },
                        { name: 'تاريخ الإغلاق', value: new Date().toLocaleString('ar-EG') }
                    )
                    .setTimestamp();

                // إرسال نسخة إلى قناة النسخ أو اللوج إذا كانت محددة
                if (settings.transcriptChannel) {
                    const transcriptChannel = interaction.guild.channels.cache.get(settings.transcriptChannel);
                    if (transcriptChannel) {
                        await transcriptChannel.send({
                            embeds: [transcriptEmbed],
                            files: [transcript]
                        });
                    }
                } else if (settings.logChannel) {
                    const logChannel = interaction.guild.channels.cache.get(settings.logChannel);
                    if (logChannel) {
                        await logChannel.send({
                            embeds: [transcriptEmbed],
                            files: [transcript]
                        });
                    }
                }
            } catch (transcriptError) {
                console.error('خطأ في إنشاء نسخة المحادثة عند الإغلاق:', transcriptError);
            }

            // إرسال إشعار لصاحب التذكرة
            if (ticketOwnerId) {
                try {
                    // حذف من قائمة التذاكر النشطة
                    delete ticketsData.activeTickets[ticketOwnerId];
                    saveData();

                    const ticketOwner = await client.users.fetch(ticketOwnerId);

                    // إنشاء إيمبد للإشعار
                    const notificationEmbed = new EmbedBuilder()
                        .setColor('#ff9900')
                        .setTitle('تم إغلاق التذكرة الخاصة بك')
                        .setDescription(`تم إغلاق التذكرة "${channel.name}" بواسطة ${interaction.user.tag}`)
                        .setTimestamp();

                    // إرسال الإيمبد ونسخة المحادثة إلى صاحب التذكرة
                    if (transcript) {
                        await ticketOwner.send({
                            embeds: [notificationEmbed],
                            files: [transcript]
                        });
                    } else {
                        await ticketOwner.send({
                            embeds: [notificationEmbed]
                        });
                    }
                } catch (dmError) {
                    console.error('خطأ في إرسال إشعار لصاحب التذكرة:', dmError);
                }
            }

            // إرسال رسالة قبل الإغلاق
            await channel.send('سيتم إغلاق هذه التذكرة خلال 5 ثوانٍ...');

            // تسجيل الإغلاق في قناة اللوج إذا كانت محددة
            if (settings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(settings.logChannel);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('تم إغلاق تذكرة')
                        .setDescription(`تم إغلاق التذكرة: ${channel.name}\nأغلقها: ${interaction.user}`)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

            await interaction.editReply({ content: 'جارٍ إغلاق التذكرة...', ephemeral: true });

            // انتظار 5 ثوانٍ ثم حذف القناة
            setTimeout(() => {
                channel.delete(`تم إغلاق التذكرة بواسطة ${interaction.user.tag}`).catch(console.error);
            }, 5000);

        } catch (error) {
            console.error('خطأ في إغلاق التذكرة:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'حدث خطأ أثناء إغلاق التذكرة. الرجاء المحاولة مرة أخرى.', 
                    ephemeral: true 
                });
            } else {
                await interaction.followUp({
                    content: 'حدث خطأ أثناء إغلاق التذكرة. الرجاء المحاولة مرة أخرى.',
                    ephemeral: true
                });
            }
        }
    } else if (interaction.customId === 'cancel_close') {
        await interaction.reply({ 
            content: 'تم إلغاء إغلاق التذكرة.', 
            ephemeral: true 
        });
    } else if (interaction.customId === 'accept_application' || interaction.customId === 'reject_application') {
        await handleApplicationResponse(interaction);
    }
});

client.login(TOKEN);