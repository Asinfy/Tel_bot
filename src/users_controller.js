const axios = require("axios");

// Valida si el cliente existe en la base de datos
const validate_user = async (email) => {
  try {
    const url_to_consult = `https://zoho.accsolutions.tech/API/v1/Usuarios2?where=Correo=="${email}"`;
    const user = await axios.get(url_to_consult);
    return {
      code: user.data.data[0] ? 200 : 400,
      data: user.data.data[0],
    };
  } catch (error) {
    return {
      code: 400,
      data: [],
    };
  }
};

const update_user = async (user_info, chat_id) => {
  try {
    const validate_chat_exists = await validate_chat_id(user_info, chat_id);
    if (validate_chat_exists.code == 200) {
      const new_data_information = {
        codigoTelegram: validate_chat_exists.id_telegram_code,
      };
      const updateUserUrl = `https://zoho.accsolutions.tech/API/v1/Usuarios2/${user_info.ID}`;
      const response = await axios.patch(updateUserUrl, new_data_information);
      return {
        code: response.data.code == 200 ? 200 : 400,
      };
    } else {
      return {
        code: 400,
      };
    }
  } catch (error) {
    return {
      code: 400,
    };
  }
};

// Validate or create new_chat_id
const validate_chat_id = async (data_info, chat_id) => {
  try {
    let new_chat_id;
    validate_exists = await axios.get(
      `https://zoho.accsolutions.tech/API/v1/codigos_telegram?where=Codigo==${chat_id}`
    );
    // If exists chat, return chat
    if (validate_exists.data.data.length > 0) {
      new_chat_id = validate_exists.data.data[0].ID;
    } else {
      // If no exists, create a new telegram code
      const new_json_code = {
        Codigo: chat_id,
        Usuario: data_info.Nombre,
      };
      const create_code = await axios.post(
        `https://zoho.accsolutions.tech/API/v1/C_digos_Telegram`,
        new_json_code
      );
      new_chat_id = create_code.data.data.ID;
    }
    return {
      code: 200,
      id_telegram_code: new_chat_id,
    };
  } catch (error) {
    return { code: 400 };
  }
};

// Validar que el usuario exista con codigo telegram
const validate_user_chat = async (chat_id) => {
  try {
    const url_to_consult = `https://zoho.accsolutions.tech/API/v1/Usuarios2?where=codigoTelegram.Codigo==${chat_id}`;
    const user = await axios.get(url_to_consult);
    return {
      code: user.data.data[0] ? 200 : 400,
      data: user.data.data[0],
    };
  } catch (error) {
    return {
      code: 400,
      data: [],
    };
  }
};

module.exports = { validate_user, update_user, validate_user_chat };
