const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = "6544699129:AAFb9TIrF3ot_6s-n55DtsTAN0-DSFBRKkE";
const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
const PORT = process.env.PORT || 5000;

const ASK_EMAIL = "ASK_EMAIL";
const ASK_CEDULA = "ASK_CEDULA";
const NEW_ASK_CEDULA = "NEW_ASK_CEDULA";
const ASK_VALUE = "ASK_VALUE";
const ASK_SECURITY = "ASK_SECURITY";

const userData = {};

// crear instancia de controller
const {
  validate_client,
  update_chat_id,
  consult_balance,
} = require("./src/client_controller");

// Controladores de usuarios
const { validate_user, update_user, validate_user_chat } = require("./src/users_controller");

// Controladores de facturas
const { validate_client_balance, create_intents } = require("./src/balance_controller");

// Función para enviar el menú principal
function sendMainMenu(chatId) {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Registrar Cliente", callback_data: "register" }],
        [{ text: "Consultar Saldo", callback_data: "consult" }],
        [{ text: "Registrar Usuario", callback_data: "register_user" }],
        [{ text: "Abonos", callback_data: "abono" }],
      ],
    },
  };
  bot.sendMessage(chatId, "Selecciona una opción:", options);
}

// Manejo del comando /start y mensaje "hola"
bot.onText(/\/start|hola/i, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "¡Hola! 👋 Bienvenido al servicio automático para nuestros clientes y usuarios TecnoSuper. ¿Qué deseas hacer hoy?"
  );
  sendMainMenu(chatId);
});

// Manejo de respuestas de los botones
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const choice = query.data;

  switch (choice) {
    case "register":
      await bot.sendMessage(
        chatId,
        "Por favor ingresa tu número de documento sin puntos, espacios y/o dígitos de verificación:"
      );
      userData[chatId] = { state: ASK_CEDULA };

      break;

    case "consult":
      const clientDetails = await consult_balance(chatId);
      let messageSend;
      if (clientDetails.code == 200) {
        const saldoFormatted = clientDetails.Saldo.toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        messageSend = `Usted tiene un saldo pendiente de ${saldoFormatted}`;
      } else {
        messageSend = `Usted no tiene saldos pendientes actualmente con TecnoSuper`;
      }

      await bot.sendMessage(chatId, messageSend);

      break;

    case "register_user":
      await bot.sendMessage(
        chatId,
        "Por favor ingresa tu correo electronico registrado en la plataforma de zoho:"
      );
      userData[chatId] = { state: ASK_EMAIL };

      break;

    case "abono":
      const validate_exist_user = await validate_user_chat(chatId);
      if (validate_exist_user.code == 200) {
        await bot.sendMessage(
          chatId,
          "Por favor ingresa el número de documento del cliente (Sin puntos, comas y/o espacios)"
        );
        userData[chatId] = { state: NEW_ASK_CEDULA, checkout: validate_exist_user.data.Caja_Principal.ID, password: validate_exist_user.data["codigoTelegram.code"], intentos:0 };
      }else {
        await bot.sendMessage(
          chatId,
          "Este usuario no se encuentra asociado en nuestra base de datos, por favor registrese antes de continuar"
        );
        sendMainMenu(chatId);
      }

      break;
    default:
      await bot.answerCallbackQuery(query.id);
      sendMainMenu(chatId);

      break;
  }
});

// Manejo de mensajes
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // Ignorar el mensaje si es un comando
  if (text.startsWith("/") || text.toLocaleLowerCase() == "hola") return;

  if (userData[chatId]) {
    const state = userData[chatId].state;
    switch (state) {
      case ASK_CEDULA:
        const cedula = text;

        // Validate client in zoho database
        const validation = await validate_client(cedula);
        if (validation.code === 200) {
          const update_chat = await update_chat_id(validation.data.ID, chatId);
          if (update_chat.code === 200) {
            const client_name = `${validation.data.Nombre} ${validation.data.Primer_Apellido}`;
            const client_send = client_name
              .toLowerCase()
              .split(" ")
              .map(
                (palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1)
              )
              .join(" ");

            await bot.sendMessage(
              chatId,
              `Señor/a ${client_send} su telegram ha sido asociado con exito!!! \n A traves de este, podrá recibir notificaciones`
            );
            sendMainMenu(chatId);
            delete userData[chatId];
          }
        } else {
          await bot.sendMessage(
            chatId,
            "El número de cédula no es correcto o no se encuentra registrado en la base de datos. Por favor ingrese el número de identificación nuevamente:"
          );
        }

        break;

      case ASK_EMAIL:
        const email = text.toLocaleLowerCase();
        // Validate client in zoho database
        const validate_mail = await validate_user(email);
        if (validate_mail.code == 200) {
          if (validate_mail.data["codigoTelegram.code"]) {
            await bot.sendMessage(
              chatId,
              `Este usuario ya se encuentra registrado en la base de datos. Recuerde que su código de seguridad es ${validate_mail.data["codigoTelegram.code"]}`
            );
          } else {
            const new_update_user = await update_user(
              validate_mail.data,
              chatId
            );
            if (new_update_user.code == 200) {
              await bot.sendMessage(chatId, "¡Registro de usuario exitoso!");
              const new_validate_email = await validate_user(email);
              await bot.sendMessage(
                chatId,
                `Este usuario se registró correctamente en la base de datos. Su nuevo código de seguridad es ${new_validate_email.data["codigoTelegram.code"]}`
              );
            } else {
              await bot.sendMessage(
                chatId,
                "Ha ocurrido un error al registrar el usuario, por favor intente nuevamente"
              );
            }
          }
        } else {
          await bot.sendMessage(
            chatId,
            "El correo electronico no es valido o no se encuentra registrado en nuestro sistema, intente nuevamente"
          );
        }

        break;

      case NEW_ASK_CEDULA:
        const new_cedula = text;
        const validate_billings = await validate_client_balance(new_cedula);
        if (validate_billings.code == 200) {
          await bot.sendMessage(
            chatId,
            "Ingresa el valor a abonar (Evite el uso de caracteres especiales, puntos, comas o espacios) $:"
          );
          userData[chatId].state = ASK_VALUE
          userData[chatId].client_id = validate_billings.data[0].Cliente.ID
          userData[chatId].saldo = validate_billings.balance
        } else {
          await bot.sendMessage(
            chatId,
            "Este cliente no se encuentra registrado o no tiene saldos pendientes. Por favor intente nuevamente"
          );
        }

        break;

      case ASK_VALUE:
        const valor_abonar = text;
        // Validate if value is < Saldo 
        if (valor_abonar > userData[chatId].saldo) {
          await bot.sendMessage(
            chatId,
            "El valor a abonar supera el saldo para el cliente, ingresa nuevamente el valor: $"
          );
        }else {
          await bot.sendMessage(
            chatId,
            "Por favor ingrese su código privado:"
          );
          userData[chatId].state = ASK_SECURITY
          userData[chatId].value = valor_abonar
        }
        break;
      
      case ASK_SECURITY:
      const text_security = text.toLocaleLowerCase();
      const validate_code = `tsh${userData[chatId].password}`
      if (text_security != validate_code) {
        // Actualizar número de intentos 
        userData[chatId].intentos = userData[chatId].intentos + 1
        if (userData[chatId].intentos < 3) {
          await bot.sendMessage(
            chatId,
            "Código de seguridad incorrecto, intente nuevamente"
          );
        }else{
          await bot.sendMessage(
            chatId,
            "Has realizado demasiados intentos, por seguridad cerraremos el proceso, vuelve a inicar nuevamente"
          );
          userData[chatId] = {}
          sendMainMenu(chatId);
        }
      }else{
        const subir_message = await create_intents(userData[chatId]); 
        if (subir_message.code == 200){
          await bot.sendMessage(
            chatId,
            "Abono realizado al cliente correctamente, recuerde que el abono se verá reflejado en su caja principal. \Gracias por usar nuestro servicio"
          );
        }else
        {
          await bot.sendMessage(
            chatId,
            "Ha ocurrido un error inesperado, por favor intente nuevamente o contacte con un administrador"
          );
        }
        userData[chatId] = {}
      }
      break;

      default:
        sendMainMenu(chatId);
        break;
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor web en ejecución en el puerto ${PORT}`);
});
