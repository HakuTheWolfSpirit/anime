# anime README

This extension provides highlighting, auto complete and linting for writing .anime files. 

Anime files are a HCL inspired way to curate anime in a way that is easy to read, easy to write and easy to parse.

Example:

```anime
@version "2.1"
anime "one-piece" {
    original_title = "ワンピース"
    year = 1999
    genres = ["Adventure", "Fantasy"]
    
    localized_titles {
        en = "One Piece"
        de = "One Piece"
        ja = "ワンピース"
    }
    
    streaming_titles {
        crunchyroll = "One Piece"
    }
    
    character "luffy" {
        name = "Monkey D. Luffy"
        
        voice_actor "ja" {
            name = "Mayumi Tanaka"
            language = "ja"
        }
    }
    
    season "1" {
        episode "1" {
            localized_titles {
                en = "I'm Luffy!"
            }
            filler = false
            length = 24
            
            public_opinion {
                sounddesign = 3
            }
        }
    }
    
    movie "strong-world" {
        localized_titles {
            en = "One Piece: Strong World"
        }
        filler = false
        length = 113
    }
}
```