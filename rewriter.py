import subprocess

hash_to_msg = {
  "93f3979": "style: adjust text sizing and layout on batches page",
  "77b380b": "style: refine tracking and margins on batches page header",
  "c10e231": "style: flatten dashboard card backgrounds and borders",
  "c0c9e13": "style: update dashboard metrics text contrast",
  "5b74360": "style: apply Bellavoir font to dashboard editorial headers",
  "7b6e562": "style: adjust dashboard table padding and spacing",
  "1db2ddc": "style: refine dashboard table row hover states",
  "f9e1f87": "style: apply Harabara font to dashboard primary titles",
  "ecac321": "feat: introduce Web3 editorial theme with custom scrollbar, dotted grid, and noise overlays",
  "9b67f9f": "style: remove default background styling from root layout",
  "f321090": "style: inject ambient background blobs into root layout",
  "8eae48c": "style: integrate scroll reveal animation into landing page hero",
  "c580eb4": "style: apply Harabara typography and emerald glow to hero section",
  "2518fa1": "style: increase letter spacing and size for Live on Stellar badge",
  "86654f8": "style: refine primary call-to-action button glassmorphism",
  "56b185b": "style: update secondary button styling on landing page",
  "c13a3b9": "style: remove solid section dividers to seamlessly merge grid backgrounds",
  "59c78bf": "style: apply glassmorphism to Bento cards in How it Works section",
  "9070a61": "style: implement interactive grid hover effects on Bento cards",
  "5d0d516": "style: refine spacing and padding for Bento card grid",
  "bdb445f": "style: apply Bellavoir font to secondary headings across landing page",
  "8061d99": "style: finalize landing page responsive layout and bottom margins",
  "53afa62": "style: apply editorial typography to verify page headers",
  "18374e1": "style: flatten verify page card backgrounds to match new aesthetic",
  "e7392cc": "style: update verify page input fields with glassmorphic borders",
  "94b1ede": "style: refine verify page button hover states",
  "7cd25bf": "style: adjust verify page table layout and spacing",
  "65f1cce": "style: update verify page status badges for better contrast",
  "73cac2a": "style: refine verify page typography hierarchy",
  "9d89c86": "style: finalize verify page responsive padding",
  "55f65c1": "style: apply backdrop-blur glassmorphism and sticky positioning to navigation bar",
  "36832ef": "feat: dynamically integrate official brand logo with light mode inversion and oversized fullstop",
  "d21940c": "style: update theme toggle button contrast and hover effects",
}

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

# get list of commits
out = run("git log --reverse --format='%h|%s' 5229564..HEAD")
commits = [line.split('|', 1) for line in out.stdout.strip().split('\n')]

run("git checkout -b new-main 5229564")

for hsh, msg in commits:
    print(f"Cherry-picking {hsh} - {msg}")
    res = run(f"git cherry-pick {hsh}")
    if res.returncode != 0:
        print(f"Failed to cherry pick {hsh}: {res.stderr}")
        run("git cherry-pick --abort")
        break
    
    if hsh in hash_to_msg:
        new_msg = hash_to_msg[hsh]
        print(f"  -> Renaming to: {new_msg}")
        run(f"git commit --amend -m \"{new_msg}\"")
    else:
        print("  -> Keeping original message")

run("git checkout main")
run("git reset --hard new-main")
run("git branch -D new-main")
run("git push -f origin main")
print("Done!")
