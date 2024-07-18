const axios = require("axios");

// Valida si el cliente existe en la base de datos
const validate_client = async (document_id) => {
  try {
    const url_to_consult = `https://zoho.accsolutions.tech/API/v1/Clientes_Report?where=Documento=="${document_id}"`;
    const client = await axios.get(url_to_consult);
    return {
      code: client.data.data[0] ? 200 : 400,
      data: client.data.data[0],
    };
  } catch (error) {
    return {
      code: 400,
      data: [],
    };
  }
};

const update_chat_id = async (id_client, chat_id) => {
  try {
    const updateClientUrl = `https://zoho.accsolutions.tech/API/v1/Clientes_Report/${id_client}`;
    const new_data = {
      idTelegram: chat_id,
    };
    const response = await axios.patch(updateClientUrl, new_data);
    return {
      code: response.data.code == 200 ? 200 : 400,
    };
  } catch (error) {
    return {
      code: 400,
    };
  }
};

const consult_balance = async (chat_id) => {
  try {
    const urlFindClient = `https://zoho.accsolutions.tech/API/v1/Clientes_Report?where=idTelegram=="${chat_id}"`;
    const response = await axios.get(urlFindClient);
    // Consult client for chat id
    if (response.data.data.length > 0) {
      const idClient = response.data.data[0].ID;

      //   COnsult checkout balance
      const urlFindBalance = `https://zoho.accsolutions.tech/API/v1/Remision_Report?where=Cliente==${idClient}&&Saldo>0`;
      const findBalanceCustomer = await axios.get(urlFindBalance);
      if (findBalanceCustomer.data.status === 400) {
        return {
          code: 400,
        };
      } else {
        return {
          code: 200,
          Saldo: sumarSaldo(findBalanceCustomer.data.data),
        };
      }
    }
  } catch (error) {
    return {
      code: 400,
    };
  }
};

const sumarSaldo = (array) => {
  var sumaTotal = array.reduce((acumulador, currencyObject) => {
    return acumulador + parseFloat(currencyObject.Saldo);
  }, 0);

  return sumaTotal;
};

module.exports = { validate_client, update_chat_id, consult_balance };
