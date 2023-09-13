// Import necessary modules
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";

// Create an Express app
const app = express();
const port = 3000;

app.set('view engine', 'ejs'); // Set EJS as the view engine
// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Connect to MongoDB
async function makeConnection() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/todolistDB", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Successfully connected to DB");
  } catch (err) {
    console.error("Error occurred while making connection:", err);
  }
}
makeConnection();

// Define a schema and model for items
const itemsSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter a name"],
  },
});

const Item = mongoose.model("Item", itemsSchema);

// Default items
const defaultItems = [
  { name: "Welcome to your todo list!" },
  { name: "Hit the + button to add a new item." },
  { name: "<-- Hit this to delete an item." },
];

// customList
const listSchema = {
  name: String,
  items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);

// Insert default items into the database
async function insertDefaultItems() {
  try {
    const count = await Item.countDocuments();
    if (count === 0) {
      await Item.insertMany(defaultItems);
      console.log("Successfully inserted default items to DB");
    }
  } catch (err) {
    console.error("Insert Default Items Error:", err);
  }
}
insertDefaultItems();

// Define routes and start the server
app.get("/", async (req, res) => {
  try {
    const items = await Item.find({});
    res.render("list", { listTitle: "Today", newListItems: items });
  } catch (err) {
    console.error("Error occurred while getting all documents:", err);
  }
});

// Creating a custom list route
app.get("/:customListName", async (req, res) => {
  const customListName = req.params.customListName;

  try {
    // Find the list by name in the database
    const foundList = await List.findOne({ name: customListName });

    if (!foundList) {
      // If the list doesn't exist, create a new one
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      await list.save();
      console.log("New custom list created.");
      res.redirect("/" + customListName);
    } else {
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    console.error("Error occurred while handling the custom list route:", err);
  }
});

// Handle the POST request to add a new item
app.post("/", async (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName,
  });

  try {
    if (listName === "Today") {
      await item.save();
      res.redirect("/"); // Redirect to the homepage to show the item
    } else {
      const foundList = await List.findOne({ name: listName });
      if (foundList) {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      } else {
        console.error("Custom list not found.");
        res.status(404).send("Custom list not found."); // Handle the case where the custom list doesn't exist
      }
    }
  } catch (err) {
    console.error("Error occurred while saving the item:", err);
  }
});

// Handle the POST request to delete an item
app.post("/delete", async (req, res) => {
  try {
    const itemId = req.body.itemId;
    const listName = req.body.listName;

    if (listName === "Today") {
      const result = await Item.deleteOne({ _id: itemId });
      console.log(result);
      res.redirect("/");
    } else {
      const result = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: itemId } } },
        { useFindAndModify: false }
      );

      console.log(result);
      res.redirect("/" + listName);
  
    }
  } catch (err) {
    console.error("Error occurred while trying to delete task:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, function () {
  console.log(`Server started on port ${port}`);
});
