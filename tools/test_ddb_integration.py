import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import asyncio
import app
import json

async def run_tests():
    print("Testing /api/ddb/fetch-preview with D&D Beyond ID 48690485...")
    preview = await app.ddb_fetch_preview({"query": "https://www.dndbeyond.com/characters/48690485"})
    char = preview["character"]
    print(f"  Name: {char['name']}")
    print(f"  Class: {char['classRole']} Level {char['level']}")
    print(f"  HP: {char['currentHp']}/{char['maxHp']}")
    print(f"  AC: {char['ac']}, Speed: {char['speed']} ft, Spell DC: {char['spellDc']}")
    print(f"  Avatar: {char['avatarUrl']}")
    print(f"  Inventory items: {len(char['inventory'])}")
    assert char['name'] == 'Eeyore'
    assert char['ddbId'] == '48690485'
    assert char['level'] == 13
    assert char['currentHp'] == 107
    assert char['ac'] == 19

    print("\nTesting /api/ddb/import (dry-run without party save)...")
    req = app.DdbImportRequest(characterData=char, addToParty=False)
    imp_res = await app.ddb_import_character(req)
    assert imp_res["status"] == "success"
    print(f"  Import Status: {imp_res['status']}")

    print("\nTesting ddb_importer.sync_dndbeyond_character with notes preservation...")
    char_with_notes = dict(char)
    char_with_notes["notes"] = "Custom DM Secret: Possesses an ancient dragon relic."
    char_with_notes["deityName"] = "Silvanus"
    char_with_notes["pietyScore"] = 7
    synced, err = app.ddb_importer.sync_dndbeyond_character(char_with_notes)
    assert err is None
    assert synced["name"] == "Eeyore"
    assert synced["ddbId"] == "48690485"
    assert "Custom DM Secret" in synced["notes"]
    assert synced["deityName"] == "Silvanus"
    assert synced["pietyScore"] == 7
    print(f"  Synced character: {synced['name']}, AC: {synced['ac']}, Piety: {synced['pietyScore']}")
    print(f"  Notes preserved: {synced['notes']}")

    print("\nTesting character serialization to JSON...")
    serialized = json.dumps(char)
    assert len(serialized) > 500

    print("\nTesting /api/ddb/upload-json...")
    from fastapi import UploadFile
    import io
    file_bytes = serialized.encode("utf-8")
    upload_file = UploadFile(filename="eeyore.json", file=io.BytesIO(file_bytes))
    upload_res = await app.ddb_upload_json(upload_file)
    assert upload_res["status"] == "success"
    assert upload_res["character"]["name"] == "Eeyore"
    print(f"  Upload JSON parsed: {upload_res['character']['name']}")

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(run_tests())
