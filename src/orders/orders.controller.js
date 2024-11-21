const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName] && data[propertyName] !== "") {
      return next();
    }
    next({
      status: 400,
      message: `Order must include a ${propertyName}`,
    });
  };
}

function quantityPropertyIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;

  for (const dish of dishes) {
    const { id, quantity } = dish;

    if (quantity && typeof quantity === "number" && quantity > 0) {
      continue;
    }

    return next({
      status: 400,
      message: `dish ${id} must have a quantity that is an integer greater than 0`,
    });
  }

  return next();
}

function dishesPropertyIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (Array.isArray(dishes) && dishes.length > 0) {
    return next();
  }
  next({
    status: 400,
    message: "Order must include at least one dish",
  });
}

function statusPropertyIsValid(req, res, next) {
  const { data: { status } = {} } = req.body;
  if (status === "delivered") {
    next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
  const validStatus = ["pending", "preparing", "out-for-delivery"];
  if (validStatus.includes(status)) {
    return next();
  }
  next({
    status: 400,
    message:
      "Order must have a status of pending, preparing, out-for-delivery, delivered",
  });
}

function canOrderBeDeleted(req, res, next) {
  if (res.locals.order.status === "pending") {
    return next();
  }
  next({
    status: 400,
    message: "An order cannot be deleted unless it is pending.",
  });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes, quantity } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    dishes: dishes,
    quantity: quantity,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function list(req, res) {
  const { orderId } = req.params;
  res.json({
    data: orders.filter(orderId ? (order) => order.id == orderId : () => true),
  });
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}`,
  });
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const foundOrder = res.locals.order;
  const { data: { deliverTo, mobileNumber, dishes, status } = {} } = req.body;

  foundOrder.deliverTo = deliverTo;
  foundOrder.mobileNumber = mobileNumber;
  foundOrder.status = status;
  foundOrder.dishes = dishes;

  res.json({ data: foundOrder });
}

function isIdValid(req, res, next) {
  const { orderId } = req.params;
  const { data } = req.body;
  if (data?.id && data.id !== orderId) {
    return next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${data.id}, Route: ${orderId}`,
    });
  }

  return next();
}

function destroy(req, res) {
  const index = orders.findIndex((order) => order.id === res.locals.order.id);
  const deletedOrder = orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesPropertyIsValid,
    quantityPropertyIsValid,
    create,
  ],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    bodyDataHas("dishes"),
    dishesPropertyIsValid,
    quantityPropertyIsValid,
    statusPropertyIsValid,
    isIdValid,
    update,
  ],
  read: [orderExists, read],
  delete: [orderExists, canOrderBeDeleted, destroy],
  list,
};
