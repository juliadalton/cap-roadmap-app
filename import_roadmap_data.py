import json
import sys

def sql_quote(value):
    """
    Safely quotes a value for SQL insertion.
    Handles None as NULL and escapes single quotes in strings.
    """
    if value is None:
        return "NULL"
    return f"'{str(value).replace("'", "''")}'"

def generate_create_table_sql():
    """
    Generates SQL CREATE TABLE statements for the roadmap data.
    """
    sql_statements = [
        """
    -- Table for Milestones
    CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        title TEXT,
        date TEXT
    );
    """,
        """
    -- Table for Users (creators/updaters of roadmap items)
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE
    );
    """,
        """
    -- Table for Roadmap Items
    CREATE TABLE IF NOT EXISTS roadmap_items (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        date TEXT,
        category TEXT,
        status TEXT,
        milestone_id TEXT,
        pirate_metrics TEXT, -- Stored as JSON string
        north_star_metrics TEXT, -- Stored as JSON string
        created_by_id TEXT,
        updated_by_id TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (milestone_id) REFERENCES milestones(id),
        FOREIGN KEY (created_by_id) REFERENCES users(id),
        FOREIGN KEY (updated_by_id) REFERENCES users(id)
    );
    """,
        """
    -- Table for Many-to-Many relationships between roadmap items
    CREATE TABLE IF NOT EXISTS roadmap_item_relations (
        from_item_id TEXT,
        to_item_id TEXT,
        PRIMARY KEY (from_item_id, to_item_id),
        FOREIGN KEY (from_item_id) REFERENCES roadmap_items(id),
        FOREIGN KEY (to_item_id) REFERENCES roadmap_items(id)
    );
    """
    ]
    return "\\n".join(sql_statements)

def generate_insert_sql(data):
    """
    Generates SQL INSERT statements from the parsed JSON data.
    """
    milestones_data = {}  # {id: {title, date}}
    users_data = {}  # {id: {name, email}}
    roadmap_items_data = []  # list of dicts for roadmap_items
    relations_data = []  # list of tuples (from_id, to_id)

    for item in data:
        # Collect Milestones
        if item.get("milestoneId") and item.get("milestone"):
            milestone_id = item["milestoneId"]
            if milestone_id not in milestones_data:
                milestones_data[milestone_id] = {
                    "title": item["milestone"].get("title"),
                    "date": item["milestone"].get("date")
                }

        # Collect Users
        if item.get("createdById") and item.get("createdBy"):
            user_id = item["createdById"]
            if user_id not in users_data and item["createdBy"]: # Ensure createdBy is not None
                users_data[user_id] = item["createdBy"]
        
        if item.get("updatedById") and item.get("updatedBy"):
            user_id = item["updatedById"]
            if user_id not in users_data and item["updatedBy"]: # Ensure updatedBy is not None
                users_data[user_id] = item["updatedBy"]

        # Collect Roadmap Items
        roadmap_item = {
            "id": item.get("id"),
            "title": item.get("title"),
            "description": item.get("description"),
            "date": item.get("date"),
            "category": item.get("category"),
            "status": item.get("status"),
            "milestone_id": item.get("milestoneId"),
            "pirate_metrics": item.get("pirateMetrics", []),
            "north_star_metrics": item.get("northStarMetrics", []),
            "created_by_id": item.get("createdById"),
            "updated_by_id": item.get("updatedById"),
            "created_at": item.get("createdAt"),
            "updated_at": item.get("updatedAt")
        }
        # Ensure item has an ID before adding
        if roadmap_item["id"]:
            roadmap_items_data.append(roadmap_item)

            # Collect Relations
            # 'relatedItems': current item has these items as related (current -> related)
            for related in item.get("relatedItems", []):
                if related.get("id"):
                    relations_data.append((item["id"], related["id"]))
            
            # 'relatedTo': other items have current item as related (other -> current)
            for related in item.get("relatedTo", []):
                if related.get("id"):
                    relations_data.append((related["id"], item["id"]))
        else:
            print(f"Warning: Skipping item due to missing ID: {item.get('title', 'Unknown title')}", file=sys.stderr)


    sql_statements = []

    # Insert Milestones
    sql_statements.append("-- INSERTING MILESTONES --")
    for m_id, m_data in milestones_data.items():
        title_sql = sql_quote(m_data.get('title'))
        date_sql = sql_quote(m_data.get('date'))
        sql_statements.append(f"INSERT INTO milestones (id, title, date) VALUES ({sql_quote(m_id)}, {title_sql}, {date_sql});")

    # Insert Users
    sql_statements.append("\\n-- INSERTING USERS --")
    for u_id, u_data in users_data.items():
        name_sql = sql_quote(u_data.get('name'))
        email_sql = sql_quote(u_data.get('email'))
        sql_statements.append(f"INSERT INTO users (id, name, email) VALUES ({sql_quote(u_id)}, {name_sql}, {email_sql});")

    # Insert Roadmap Items
    sql_statements.append("\\n-- INSERTING ROADMAP ITEMS --")
    for r_item in roadmap_items_data:
        item_id_sql = sql_quote(r_item['id'])
        title_sql = sql_quote(r_item.get('title'))
        desc_sql = sql_quote(r_item.get('description'))
        date_sql = sql_quote(r_item.get('date'))
        category_sql = sql_quote(r_item.get('category'))
        status_sql = sql_quote(r_item.get('status'))
        m_id_sql = sql_quote(r_item.get('milestone_id'))
        pirate_metrics_sql = sql_quote(json.dumps(r_item.get("pirate_metrics", [])))
        north_star_metrics_sql = sql_quote(json.dumps(r_item.get("north_star_metrics", [])))
        created_by_sql = sql_quote(r_item.get('created_by_id'))
        updated_by_sql = sql_quote(r_item.get('updated_by_id'))
        created_at_sql = sql_quote(r_item.get('created_at'))
        updated_at_sql = sql_quote(r_item.get('updated_at'))

        sql_statements.append(
            f"INSERT INTO roadmap_items (id, title, description, date, category, status, milestone_id, "
            f"pirate_metrics, north_star_metrics, created_by_id, updated_by_id, created_at, updated_at) VALUES ("
            f"{item_id_sql}, {title_sql}, {desc_sql}, {date_sql}, {category_sql}, {status_sql}, {m_id_sql}, "
            f"{pirate_metrics_sql}, {north_star_metrics_sql}, {created_by_sql}, {updated_by_sql}, {created_at_sql}, {updated_at_sql}"
            f");"
        )
    
    # Insert Relations
    sql_statements.append("\\n-- INSERTING ROADMAP ITEM RELATIONS --")
    unique_relations = set()
    for from_id, to_id in relations_data:
        if (from_id, to_id) not in unique_relations:
            # Ensure both from_id and to_id are valid before inserting
            # (This assumes roadmap_items_data contains all valid item IDs)
            # For simplicity, we trust the data source here. In a robust system, check existence.
            from_id_sql = sql_quote(from_id)
            to_id_sql = sql_quote(to_id)
            sql_statements.append(f"INSERT INTO roadmap_item_relations (from_item_id, to_item_id) VALUES ({from_id_sql}, {to_id_sql});")
            unique_relations.add((from_id, to_id))
            
    return "\\n".join(sql_statements)

def main(json_file_path):
    """
    Main function to generate the SQL script.
    Reads data from json_file_path and prints SQL to stdout.
    """
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found at {json_file_path}", file=sys.stderr)
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {json_file_path}", file=sys.stderr)
        return
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        return

    output_script = ["-- SQL Script to seed the database from roadmap export JSON --\\n"]
    output_script.append("-- Generated on import by Python script --\\n")
    
    output_script.append("\\n-- SCHEMA CREATION --")
    output_script.append(generate_create_table_sql())
    
    output_script.append("\\n\\n-- DATA INSERTION --")
    output_script.append(generate_insert_sql(data))
    
    output_script.append("\\n-- END OF SCRIPT --")
    
    print("\\n".join(output_script))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        json_file_path_arg = sys.argv[1]
    else:
        # Default path if no argument is provided
        json_file_path_arg = 'scripts/roadmap-export.json' 
        print(f"No JSON file path provided. Using default: {json_file_path_arg}", file=sys.stderr)
    
    main(json_file_path_arg) 