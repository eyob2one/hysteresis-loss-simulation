import os
from pathlib import Path

def main():
    # Detect or create backend/data directory
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "backend" / "data"
    
    if not data_dir.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {data_dir}")
    else:
        print(f"Directory already exists: {data_dir}")

    # Complete raw CSV dataset content strings
    bh_materials_content = """material,H_A_per_m,B_Tesla
M4_Silicon_Steel,0.0,0.00
M4_Silicon_Steel,20.0,0.15
M4_Silicon_Steel,50.0,0.80
M4_Silicon_Steel,100.0,1.40
M4_Silicon_Steel,200.0,1.65
M4_Silicon_Steel,500.0,1.75
M4_Silicon_Steel,1000.0,1.80
3C90_Ferrite,0.0,0.00
3C90_Ferrite,10.0,0.05
3C90_Ferrite,25.0,0.20
3C90_Ferrite,50.0,0.35
3C90_Ferrite,100.0,0.40
3C90_Ferrite,200.0,0.42
"""

    core_loss_training_content = """material,frequency,b_peak,p_loss
3C94_MnZn,50000,0.1,50.0
3C94_MnZn,50000,0.2,250.0
3C94_MnZn,100000,0.1,120.0
3C94_MnZn,100000,0.2,600.0
77_Powder,50000,0.1,80.0
77_Powder,50000,0.2,400.0
77_Powder,100000,0.1,200.0
77_Powder,100000,0.2,1000.0
"""

    # Define file paths
    bh_file = data_dir / "bh_materials.csv"
    core_loss_file = data_dir / "core_loss_training.csv"

    # Safely open, write, and save files
    try:
        with open(bh_file, 'w', encoding='utf-8') as f:
            f.write(bh_materials_content)
        print(f"[OK] Successfully written B-H materials dataset to: {bh_file}")

        with open(core_loss_file, 'w', encoding='utf-8') as f:
            f.write(core_loss_training_content)
        print(f"[OK] Successfully written Core Loss training dataset to: {core_loss_file}")
        
        print("\n[DONE] All test datasets generated successfully. You're ready to train the models!")
    except Exception as e:
        print(f"[ERROR] Error writing files: {e}")

if __name__ == "__main__":
    main()
